import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const { width, height } = Dimensions.get('window');
const MIN_ML_CONFIDENCE = 0.65;

// ── Pill badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    pending:   { bg: '#2a1f00', border: '#ffaa00', text: '#ffaa00' },
    approved:  { bg: '#1a3a1a', border: '#4dff4d', text: '#4dff4d' },
    completed: { bg: '#1a3a2a', border: '#00ffaa', text: '#00ffaa' },
    cancelled: { bg: '#331111', border: '#ff4444', text: '#ff4444' },
    failed:    { bg: '#331111', border: '#ff4444', text: '#ff4444' },
  };
  const s = map[status] || map.pending;
  return (
    <View style={[badgeStyle.pill, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[badgeStyle.text, { color: s.text }]}>{String(status || 'pending').toUpperCase()}</Text>
    </View>
  );
};
const badgeStyle = StyleSheet.create({
  pill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  text: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
});

// ── Confidence ring ──────────────────────────────────────────────────────────
const ConfidenceDot = ({ value }) => {
  const color = value >= MIN_ML_CONFIDENCE ? '#4dff4d' : value >= 0.5 ? '#ffaa00' : '#ff4444';
  return (
    <View style={[ringStyle.ring, { borderColor: color }]}>
      <Text style={[ringStyle.pct, { color }]}>{(value * 100).toFixed(0)}%</Text>
    </View>
  );
};
const ringStyle = StyleSheet.create({
  ring: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a1a0a' },
  pct: { fontSize: 11, fontWeight: '800' },
});

export default function MarketplaceDashboard({ navigation }) {
  const [token, setToken]               = useState(null);
  const [role, setRole]                 = useState('marketplaceuser');
  const [user, setUser]                 = useState(null);
  const [walletAddress, setWalletAddress] = useState('');

  const [listings, setListings]   = useState([]);
  const [myOrders, setMyOrders]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Wallet NFT states
  const [walletNFTs, setWalletNFTs] = useState([]);
  const [walletTotalCarbon, setWalletTotalCarbon] = useState(0);
  const [walletTotalSpent, setWalletTotalSpent] = useState(0);
  const [nftCount, setNftCount] = useState(0);

  const [checkoutVisible,    setCheckoutVisible]    = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [detailsModalVisible,setDetailsModalVisible]= useState(false);
  const [calculatorModalVisible,setCalculatorModalVisible]= useState(false);
  const [selectedListing,    setSelectedListing]    = useState(null);
  const [selectedOrder,      setSelectedOrder]      = useState(null);

  const [tempWalletInput, setTempWalletInput] = useState('');
  const [savingWallet,    setSavingWallet]    = useState(false);
  const [placingOrder,    setPlacingOrder]    = useState(false);

  const [flightMiles,         setFlightMiles]         = useState('');
  const [carMiles,            setCarMiles]            = useState('');
  const [electricityKwh,      setElectricityKwh]      = useState('');
  const [calculatedFootprint, setCalculatedFootprint] = useState(null);
  const [hideFailedOrders,    setHideFailedOrders]    = useState(false);

  const isBuyer  = role === 'marketplaceuser';
  const hasWallet = !!walletAddress;

  const canBuyListing = (confidence) => Number(confidence || 0) >= MIN_ML_CONFIDENCE;

  // HACKATHON FIX: Default seller ID (Anived's farmer ID)
  const DEFAULT_SELLER_ID = '69d0999f34a09dde7c309982';
  const DEFAULT_SELLER_NAME = 'Anived (Farmer)';

  // ── helpers ─────────────────────────────────────────────────────────────────
  const calculateGrowthProjection = (currentCarbonTons, areaHectares, forestType = 'mature') => {
    const sequestrationRates = {
      restoration: 25,
      mature: 8,
      degraded: 2.5,
    };

    const annualRate = sequestrationRates[forestType] || 8;
    const annualNewCarbon = areaHectares * annualRate;
    const projectedNextYear = currentCarbonTons + annualNewCarbon;
    const projectedYear2 = projectedNextYear + annualNewCarbon;
    const projectedYear3 = projectedYear2 + annualNewCarbon;
    const percentIncrease = currentCarbonTons > 0 ? (annualNewCarbon / currentCarbonTons) * 100 : 0;

    return {
      annualNewCarbon: annualNewCarbon.toFixed(2),
      projectedNextYear: projectedNextYear.toFixed(2),
      projectedYear2: projectedYear2.toFixed(2),
      projectedYear3: projectedYear3.toFixed(2),
      percentIncrease: percentIncrease.toFixed(1),
      exAntePrice: (annualNewCarbon * 8).toFixed(2),
      exPostPrice: (currentCarbonTons * 25).toFixed(2),
    };
  };

  const mapProjectToListing = (project) => {
    const mlResults        = project?.mlAnalysisResults?.final_results || {};
    const satelliteResults = project?.mlAnalysisResults?.component_results?.satellite || {};

    let co2PerHectare = 0, carbonTons = 0;
    if (mlResults.carbon_sequestration_kg && project.areaHectares) {
      carbonTons    = Number((mlResults.carbon_sequestration_kg / 1000).toFixed(2));
      co2PerHectare = Number((carbonTons / project.areaHectares).toFixed(2));
    }
    if (co2PerHectare === 0 && project?.mlAnalysisResults?.co2_t_per_ha) {
      co2PerHectare = Number(project.mlAnalysisResults.co2_t_per_ha);
      carbonTons    = Number((co2PerHectare * (project.areaHectares || 0)).toFixed(2));
    }

    const areaHectares = Number(project.areaHectares || 0);
    const carbonKg     = carbonTons * 1000;
    const priceMatic   = Number((carbonTons * 10).toFixed(2));
    const priceUSD     = Number((carbonTons * 25).toFixed(2));
    const confidence   = satelliteResults.confidence || project?.mlAnalysisResults?.confidence || 0;
    const forestType = project?.forestType || project?.mlAnalysisResults?.forestType || 'mature';
    const growthProjection = calculateGrowthProjection(carbonTons, areaHectares, forestType);

    // HACKATHON FIX: Force seller ID to default farmer ID
    const forcedOwnerId = DEFAULT_SELLER_ID;
    const forcedOwnerName = DEFAULT_SELLER_NAME;

    return {
      id: project._id,
      title:       project.title || 'Untitled Project',
      description: project.description || 'Verified blue carbon credit project',
      ownerId: forcedOwnerId,
      ownerName: forcedOwnerName,
      location:  typeof project.location === 'string' ? project.location : project.location?.address || '',
      areaHectares, carbonKg, carbonTons, priceUSD, priceMatic, confidence,
      treeHeight:   satelliteResults.height_m || 0,
      biomass:      mlResults.agb_Mg_per_ha   || 0,
      samplePoints: satelliteResults.n_points  || 0,
      growthProjection,
      status: project.status,
      project,
    };
  };

  const loadSession = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedRole  = await AsyncStorage.getItem('role');
      const rawUser     = await AsyncStorage.getItem('user');
      let parsedUser = null;
      if (rawUser) { try { parsedUser = JSON.parse(rawUser); } catch {} }
      setToken(storedToken || null);
      setRole(storedRole || parsedUser?.role || 'marketplaceuser');
      setUser(parsedUser);
      setWalletAddress(parsedUser?.walletAddress || '');
    } catch (e) { console.error('loadSession', e); }
  }, []);

  const fetchMarketplaceData = useCallback(async (showLoader = false) => {
    if (!token) return;
    if (showLoader) setLoading(true);
    try {
      const projectsRes = await axios.get(`${API_BASE}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setListings((projectsRes.data?.projects || []).map(mapProjectToListing));

      const endpoint  = isBuyer ? '/api/orders/my-orders' : '/api/orders/my-seller-orders';
      const ordersRes = await axios.get(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyOrders(ordersRes.data?.orders || []);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load marketplace');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isBuyer]);

  // Fetch wallet NFTs (for buyer dashboard)
  const fetchWalletNFTs = useCallback(async () => {
    if (!walletAddress || !token || !isBuyer) return;
    try {
      const response = await axios.get(`${API_BASE}/api/mint/wallet-nfts/${walletAddress}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setWalletTotalCarbon(response.data.totals?.carbonTons || 0);
        setWalletTotalSpent(response.data.totals?.inr || 0);
        setNftCount(response.data.count || 0);
        setWalletNFTs(response.data.nfts || []);
      }
    } catch (error) {
      console.error('Failed to fetch wallet NFTs:', error);
    }
  }, [walletAddress, token, isBuyer]);

  // Load wallet NFTs when wallet connects
  useEffect(() => {
    if (walletAddress && token && isBuyer) {
      fetchWalletNFTs();
    }
  }, [walletAddress, token, isBuyer, fetchWalletNFTs]);

  const saveWalletAddress = async (address) => {
    try {
      setSavingWallet(true);
      const res = await axios.patch(
        `${API_BASE}/api/orders/update-wallet`,
        { walletAddress: address },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setWalletAddress(address);
        if (user) {
          const u = { ...user, walletAddress: address };
          setUser(u);
          await AsyncStorage.setItem('user', JSON.stringify(u));
        }
        // After saving wallet, fetch NFTs
        await fetchWalletNFTs();
        return true;
      }
      return false;
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to save wallet');
      return false;
    } finally { setSavingWallet(false); }
  };

  const calculateFootprint = () => {
    const totalKg   = (parseFloat(flightMiles) || 0) * 0.2
                    + (parseFloat(carMiles)     || 0) * 0.4
                    + (parseFloat(electricityKwh)|| 0) * 0.5;
    const totalTons = totalKg / 1000;
    setCalculatedFootprint({
      totalKg:       totalKg.toFixed(0),
      totalTons:     totalTons.toFixed(2),
      suggestedTons: Math.ceil(totalTons),
    });
  };

  const buySuggestedAmount = () => {
    if (calculatedFootprint?.suggestedTons > 0) {
      setCalculatorModalVisible(false);
      Alert.alert('Filter Applied', `Showing credits with ${calculatedFootprint.suggestedTons}+ tons`);
    }
  };

  const generateCertificateHTML = (order) => {
    const project = order?.project || {};
    const amount  = order?.amount  || {};
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Carbon Credit Certificate</title>
    <style>
      body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:linear-gradient(135deg,#0d1f0d,#0f2a0f);margin:0;padding:40px;display:flex;justify-content:center;align-items:center;min-height:100vh;}
      .certificate{max-width:800px;width:100%;background:white;border-radius:20px;padding:40px;box-shadow:0 20px 40px rgba(0,0,0,.3);text-align:center;}
      .seal{width:100px;height:100px;background:#4dff4d;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:50px;}
      h1{color:#0d1f0d;font-size:28px;margin-bottom:10px;}
      .subtitle{color:#666;font-size:14px;margin-bottom:30px;border-bottom:2px solid #4dff4d;display:inline-block;padding-bottom:5px;}
      .buyer-name{font-size:24px;font-weight:bold;color:#0d1f0d;margin:20px 0;}
      .amount{font-size:48px;font-weight:bold;color:#4dff4d;margin:10px 0;}
      .project-name{font-size:20px;color:#0d1f0d;margin:10px 0;}
      .details{background:#f5f5f5;border-radius:10px;padding:20px;margin:20px 0;text-align:left;}
      .detail-row{display:flex;justify-content:space-between;margin-bottom:10px;}
      .detail-label{font-weight:bold;color:#333;}.detail-value{color:#666;}
      .footer{margin-top:30px;font-size:12px;color:#999;}
    </style></head><body>
    <div class="certificate">
      <div class="seal">🌿</div>
      <h1>CARBON CREDIT CERTIFICATE</h1>
      <div class="subtitle">Verified Carbon Offset</div>
      <div class="buyer-name">${user?.name || user?.email || 'Verified Buyer'}</div>
      <div class="amount">${amount.carbonTons || 0} tCO₂</div>
      <div class="project-name">${project.title || 'Carbon Credit Project'}</div>
      <div class="details">
        <div class="detail-row"><span class="detail-label">Certificate ID:</span><span class="detail-value">${order._id?.slice(-8) || 'N/A'}</span></div>
        <div class="detail-row"><span class="detail-label">Purchase Date:</span><span class="detail-value">${new Date(order.createdAt).toLocaleDateString()}</span></div>
        <div class="detail-row"><span class="detail-label">Project Location:</span><span class="detail-value">${project.location || 'Verified Carbon Project'}</span></div>
        <div class="detail-row"><span class="detail-label">Seller:</span><span class="detail-value">${order.seller?.name || 'Verified Farmer'}</span></div>
        <div class="detail-row"><span class="detail-label">Transaction Hash:</span><span class="detail-value">${order.transactionHash || 'Pending blockchain confirmation'}</span></div>
      </div>
      <div class="footer">This certificate verifies that the above-named individual has offset ${amount.carbonTons || 0} tonnes of CO₂<br/>through verified blue carbon projects. Backed by satellite ML analysis and Solana blockchain.</div>
    </div></body></html>`;
  };

  const downloadCertificate = async (order) => {
    try {
      const { uri } = await Print.printToFileAsync({ html: generateCertificateHTML(order) });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save Certificate' });
    } catch { Alert.alert('Error', 'Failed to generate certificate'); }
  };

  useEffect(() => { loadSession(); }, [loadSession]);
  useEffect(() => { if (token) fetchMarketplaceData(true); }, [token, fetchMarketplaceData]);

  const onRefresh = async () => { setRefreshing(true); await fetchMarketplaceData(false); await fetchWalletNFTs(); };

  const handleBuyCredits = (listing) => {
    if (!canBuyListing(listing?.confidence)) {
      Alert.alert('Unavailable', 'Only projects with 65% or higher ML confidence can be purchased.');
      return;
    }
    if (!isBuyer) { Alert.alert('View Only', 'Farmers can view listings but cannot buy credits.'); return; }
    
    // Validate listing has required fields
    if (!listing.id) {
      Alert.alert('Error', 'Project ID missing');
      return;
    }
    if (!listing.ownerId) {
      Alert.alert('Error', 'Seller ID missing. Cannot place order.');
      return;
    }
    if (listing.carbonTons <= 0) {
      Alert.alert('Error', 'Invalid carbon amount');
      return;
    }
    
    setSelectedListing(listing);
    if (!hasWallet) { setWalletModalVisible(true); return; }
    setCheckoutVisible(true);
  };

  const handleSaveWalletAndContinue = async () => {
    if (!tempWalletInput.trim()) { Alert.alert('Error', 'Please enter a wallet address'); return; }
    const saved = await saveWalletAddress(tempWalletInput.trim());
    if (saved && selectedListing) {
      setWalletModalVisible(false);
      setTempWalletInput('');
      setCheckoutVisible(true);
    }
  };

  const placeOrder = async () => {
    if (!selectedListing) return;
    
    // Validate before sending
    if (!selectedListing.id) {
      Alert.alert('Error', 'Project ID missing');
      return;
    }
    if (!selectedListing.ownerId) {
      Alert.alert('Error', 'Seller ID missing');
      return;
    }
    if (selectedListing.carbonTons <= 0) {
      Alert.alert('Error', 'Invalid carbon amount');
      return;
    }
    
    try {
      setPlacingOrder(true);
      
      const orderPayload = {
        projectId: selectedListing.id,
        sellerId: selectedListing.ownerId,
        carbonKg: selectedListing.carbonKg,
        carbonTons: selectedListing.carbonTons,
        priceMatic: selectedListing.priceMatic,
        priceUSD: selectedListing.priceUSD,
      };
      
      console.log('📦 Order Payload:', orderPayload);
      
      const response = await axios.post(
        `${API_BASE}/api/orders/create`,
        orderPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Order response:', response.data);
      
      const order = response.data?.order;
      if (order?.status === 'failed') {
        // CHANGED: Check if NFT transfer failed and show appropriate error
        Alert.alert('Transfer Failed', order.adminNotes || 'NFT transfer failed. The credit may not be minted yet.');
        setCheckoutVisible(false);
        setSelectedListing(null);
        await fetchMarketplaceData(false);
        return;
      }
      
      setCheckoutVisible(false);
      setSelectedListing(null);
      Alert.alert('Success', order?.status === 'completed' 
        ? 'Purchase completed and NFT transferred successfully!' 
        : 'Purchase request submitted successfully!');
      await fetchMarketplaceData(false);
    } catch (err) {
      console.error('❌ Order error:', err.response?.data || err.message);
      Alert.alert('Purchase Failed', err?.response?.data?.message || 'Unable to create order');
    } finally { setPlacingOrder(false); }
  };

  const totals = useMemo(() => {
    if (!myOrders.length) return { totalCreditsTons: 0, totalValueUSD: 0 };
    return {
      totalCreditsTons: Number(myOrders.reduce((s, o) => s + Number(o?.amount?.carbonTons || 0), 0).toFixed(2)),
      totalValueUSD:    Number(myOrders.reduce((s, o) => s + Number(o?.amount?.priceUSD    || 0), 0).toFixed(2)),
    };
  }, [myOrders]);

  // Use wallet NFT data for buyer dashboard
  const displayTotalCarbon = isBuyer && walletTotalCarbon > 0 ? walletTotalCarbon : (totals?.totalCreditsTons || 0);
  const displayTotalSpent = isBuyer && walletTotalSpent > 0 ? walletTotalSpent : (totals?.totalValueUSD || 0);
  const displayNftCount = isBuyer && nftCount > 0 ? nftCount : (myOrders?.length || 0);

  // Filter orders based on hide failed setting
  const displayedOrders = hideFailedOrders ? myOrders.filter(order => order?.status !== 'failed') : myOrders;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <LinearGradient colors={['#0d1f0d', '#0f2a0f']} style={S.gradient}>
        <SafeAreaView style={S.container}>
          <View style={S.centerContainer}>
            <ActivityIndicator size="large" color="#4dff4d" />
            <Text style={S.loadingText}>Loading marketplace…</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={['#0d1f0d', '#0f2a0f']} style={S.gradient}>
      <SafeAreaView style={S.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4dff4d" />}
        >

          {/* ── TOP HEADER BAR ── */}
          <View style={S.topBar}>
            <View>
              <Text style={S.topBarTitle}>Carbon Marketplace</Text>
              <Text style={S.topBarSub}>
                {listings.length} verified credits · {isBuyer ? 'Buyer' : 'Farmer view'}
              </Text>
            </View>
            <View style={S.topBarActions}>
              {isBuyer && (
                <TouchableOpacity style={S.iconBtn} onPress={() => setCalculatorModalVisible(true)}>
                  <Ionicons name="calculator-outline" size={20} color="#4dff4d" />
                </TouchableOpacity>
              )}
              {isBuyer ? (
                <TouchableOpacity
                  style={[S.walletChip, hasWallet && S.walletChipConnected]}
                  onPress={() => setWalletModalVisible(true)}
                >
                  <Ionicons name={hasWallet ? 'wallet' : 'wallet-outline'} size={13} color={hasWallet ? '#4dff4d' : '#aaaaaa'} />
                  <Text style={[S.walletChipText, hasWallet && { color: '#4dff4d' }]}>
                    {hasWallet ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}` : 'Add Wallet'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={S.farmerBadge}>
                  <Ionicons name="eye-outline" size={12} color="#ffaa00" />
                  <Text style={S.farmerBadgeText}>FARMER</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── KPI ROW ── */}
          <View style={S.kpiRow}>
            <LinearGradient colors={['#1a3a1a', '#142a14']} style={[S.kpiCard, S.kpiCardAccent]}>
              <Text style={S.kpiIcon}>🌿</Text>
              <Text style={S.kpiValue}>{displayTotalCarbon}</Text>
              <Text style={S.kpiUnit}>tCO₂</Text>
              <Text style={S.kpiLabel}>{isBuyer ? 'Total Offset' : 'Credits Sold'}</Text>
            </LinearGradient>
            <View style={S.kpiCol}>
              <View style={S.kpiSmall}>
                <Text style={S.kpiSmallValue}>{displayNftCount}</Text>
                <Text style={S.kpiSmallLabel}>{isBuyer ? 'NFTs Owned' : 'Total Orders'}</Text>
              </View>
              <View style={[S.kpiSmall, S.kpiSmallBottom]}>
                <Text style={S.kpiSmallValue}>${displayTotalSpent}</Text>
                <Text style={S.kpiSmallLabel}>{isBuyer ? 'Total Spent' : 'Total Earned'}</Text>
              </View>
            </View>
          </View>

          {/* Trees Equivalent Banner */}
          {isBuyer && displayTotalCarbon > 0 && (
            <View style={S.treesBanner}>
              <Text style={S.treesIcon}>🌳</Text>
              <Text style={S.treesText}>
                Equivalent to planting <Text style={S.treesHighlight}>{(displayTotalCarbon * 20).toFixed(0)} trees</Text>
              </Text>
            </View>
          )}

          {/* ── SECTION: ORDERS ── */}
          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionTitle}>{isBuyer ? 'My Purchases' : 'Orders on My Credits'}</Text>
              <View style={S.headerActions}>
                {myOrders.some(order => order?.status === 'failed') && (
                  <TouchableOpacity onPress={() => setHideFailedOrders(!hideFailedOrders)}>
                    <Text style={S.hideFailedText}>
                      {hideFailedOrders ? 'Show Failed' : 'Hide Failed'}
                    </Text>
                  </TouchableOpacity>
                )}
                {displayedOrders.length > 5 && (
                  <TouchableOpacity>
                    <Text style={S.seeAll}>See all →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {displayedOrders.length === 0 ? (
              <View style={S.emptyOrders}>
                <Ionicons name="receipt-outline" size={32} color="#2a4e2a" />
                <Text style={S.emptyOrdersText}>
                  {hideFailedOrders && myOrders.some(order => order?.status === 'failed') 
                    ? 'Failed purchases hidden. No other purchases yet.' 
                    : isBuyer ? 'No purchases yet. Browse credits below.' : 'No sales yet.'
                  }
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.ordersScroll}>
                {displayedOrders.slice(0, 8).map((order) => (
                  <View key={order._id} style={S.orderCard}>
                    <View style={S.orderCardTop}>
                      <Text style={S.orderCardTitle} numberOfLines={2}>{order?.project?.title || 'Carbon Credit'}</Text>
                      <View style={S.orderCardTopRight}>
                        <StatusBadge status={order?.status} />
                        {order?.status === 'failed' && (
                          // CHANGED: Add dismiss button for failed transactions
                          <TouchableOpacity 
                            style={S.dismissBtn} 
                            onPress={() => setMyOrders(prev => prev.filter(o => o._id !== order._id))}
                          >
                            <Ionicons name="close" size={14} color="#ff4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <View style={S.orderCardDivider} />
                    <View style={S.orderCardStats}>
                      <View style={S.orderStat}>
                        <Text style={S.orderStatVal}>{Number(order?.amount?.carbonTons || 0).toFixed(2)}</Text>
                        <Text style={S.orderStatLbl}>tCO₂</Text>
                      </View>
                      <View style={S.orderStatDivider} />
                      <View style={S.orderStat}>
                        <Text style={S.orderStatVal}>${Number(order?.amount?.priceUSD || 0).toFixed(0)}</Text>
                        <Text style={S.orderStatLbl}>USD</Text>
                      </View>
                    </View>
                    {order?.status === 'completed' && (
                      <TouchableOpacity style={S.certBtn} onPress={() => downloadCertificate(order)}>
                        <Ionicons name="document-text-outline" size={12} color="#4dff4d" />
                        <Text style={S.certBtnText}>Certificate</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* ── SECTION: LISTINGS ── */}
          <View style={[S.section, { paddingBottom: 0 }]}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionTitle}>Available Credits</Text>
              <Text style={S.sectionMeta}>{listings.length} listed</Text>
            </View>
          </View>

          <View style={S.listingsGrid}>
            {listings.length === 0 ? (
              <View style={S.emptyState}>
                <Text style={S.emptyIcon}>🌍</Text>
                <Text style={S.emptyText}>No verified credits available yet</Text>
              </View>
            ) : (
              listings.map((listing) => (
                <TouchableOpacity
                  key={listing.id}
                  style={S.listingCard}
                  onPress={() => { setSelectedListing(listing); setDetailsModalVisible(true); }}
                  activeOpacity={0.82}
                >
                  {/* Card Header */}
                  <View style={S.cardHead}>
                    <View style={S.cardHeadLeft}>
                      <Text style={S.cardTitle} numberOfLines={1}>{listing.title}</Text>
                      <Text style={S.cardSeller} numberOfLines={1}>👨‍🌾 {listing.ownerName}</Text>
                    </View>
                    <ConfidenceDot value={listing.confidence} />
                  </View>

                  {!!listing.growthProjection && (
                    <View style={S.growthBadge}>
                      <Text style={S.growthText}>📈 +{listing.growthProjection.percentIncrease}% projected</Text>
                    </View>
                  )}

                  {/* Stats Strip */}
                  <View style={S.cardStats}>
                    <View style={S.cardStat}>
                      <Text style={S.cardStatVal}>{listing.carbonTons}</Text>
                      <Text style={S.cardStatLbl}>tCO₂</Text>
                    </View>
                    <View style={S.cardStatDivider} />
                    <View style={S.cardStat}>
                      <Text style={S.cardStatVal}>{listing.areaHectares}</Text>
                      <Text style={S.cardStatLbl}>hectares</Text>
                    </View>
                    <View style={S.cardStatDivider} />
                    <View style={S.cardStat}>
                      <Text style={[S.cardStatVal, S.cardPrice]}>{listing.priceMatic}</Text>
                      <Text style={S.cardStatLbl}>MATIC</Text>
                    </View>
                  </View>

                  {/* Location */}
                  {!!listing.location && (
                    <View style={S.cardLocation}>
                      <Ionicons name="location-outline" size={11} color="#667" />
                      <Text style={S.cardLocationText} numberOfLines={1}>{listing.location}</Text>
                    </View>
                  )}

                  {/* Action */}
                  {isBuyer ? (
                    canBuyListing(listing.confidence) ? (
                      <TouchableOpacity
                        style={S.buyBtn}
                        onPress={() => handleBuyCredits(listing)}
                      >
                        <Text style={S.buyBtnText}>Buy Credits</Text>
                        <Ionicons name="arrow-forward" size={14} color="#000" />
                      </TouchableOpacity>
                    ) : (
                      <View style={S.buyBtnDisabled}>
                        <Ionicons name="close-circle-outline" size={14} color="#163d16" />
                        <Text style={S.buyBtnDisabledText}>Disabled</Text>
                      </View>
                    )
                  ) : (
                    <View style={S.lockedPill}>
                      <Ionicons name="lock-closed-outline" size={12} color="#ffaa00" />
                      <Text style={S.lockedPillText}>Purchase disabled</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* ══════════════ CREDIT DETAILS MODAL ══════════════ */}
        <Modal visible={detailsModalVisible} transparent animationType="slide" onRequestClose={() => setDetailsModalVisible(false)}>
          <View style={M.overlay}>
            <View style={M.sheet}>
              <View style={M.handle} />
              <View style={M.sheetHeader}>
                <Text style={M.sheetTitle}>Credit Details</Text>
                <TouchableOpacity style={M.closeBtn} onPress={() => setDetailsModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#aaa" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedListing && (
                  <>
                    <Text style={M.detailHero}>{selectedListing.title}</Text>

                    <View style={M.confidenceRow}>
                      <Text style={M.confidenceLabel}>ML Confidence</Text>
                      <View style={M.barBg}>
                        <View style={[M.barFill, {
                          width: `${selectedListing.confidence * 100}%`,
                          backgroundColor: selectedListing.confidence >= MIN_ML_CONFIDENCE ? '#4dff4d' : selectedListing.confidence >= 0.5 ? '#ffaa00' : '#ff4444',
                        }]} />
                      </View>
                      <Text style={[M.confidenceVal, { color: selectedListing.confidence >= MIN_ML_CONFIDENCE ? '#4dff4d' : '#ffaa00' }]}>
                        {(selectedListing.confidence * 100).toFixed(1)}%
                      </Text>
                    </View>

                    <View style={M.chipRow}>
                      {[
                        { label: 'CO₂', val: `${selectedListing.carbonTons} t` },
                        { label: 'Area', val: `${selectedListing.areaHectares} ha` },
                        { label: 'Height', val: `${selectedListing.treeHeight?.toFixed(1) || '–'} m` },
                        { label: 'Points', val: String(selectedListing.samplePoints || '–') },
                      ].map((c) => (
                        <View key={c.label} style={M.chip}>
                          <Text style={M.chipVal}>{c.val}</Text>
                          <Text style={M.chipLbl}>{c.label}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={M.divider} />

                    {[
                      { section: '📊 ML Verification', rows: [
                        ['CO₂ / ha', `${((selectedListing.carbonTons / selectedListing.areaHectares) || 0).toFixed(2)} tCO₂/ha`],
                        ['Biomass', `${selectedListing.biomass?.toFixed(2) || 'N/A'} Mg/ha`],
                        ['Satellite Points', String(selectedListing.samplePoints || 'N/A')],
                      ]},
                      { section: '📍 Project Info', rows: [
                        ['Location', selectedListing.location || 'Not specified'],
                        ['Seller', selectedListing.ownerName],
                      ]},
                      { section: '💰 Pricing', rows: [
                        ['MATIC', `${selectedListing.priceMatic} MATIC`],
                        ['USD', `$${selectedListing.priceUSD}`],
                        ['Per tCO₂', `$${(selectedListing.priceUSD / selectedListing.carbonTons).toFixed(2)}`],
                      ]},
                    ].map(({ section, rows }) => (
                      <View key={section} style={M.detailBlock}>
                        <Text style={M.detailBlockTitle}>{section}</Text>
                        {rows.map(([lbl, val]) => (
                          <View key={lbl} style={M.detailRow}>
                            <Text style={M.detailLbl}>{lbl}</Text>
                            <Text style={M.detailVal}>{val}</Text>
                          </View>
                        ))}
                      </View>
                    ))}

                    {!!selectedListing.growthProjection && (
                      <View style={M.detailBlock}>
                        <Text style={M.detailBlockTitle}>📈 Carbon Growth Projection</Text>
                        <View style={M.detailRow}>
                          <Text style={M.detailLbl}>Annual Sequestration</Text>
                          <Text style={M.detailVal}>+{selectedListing.growthProjection.annualNewCarbon} tCO₂/year</Text>
                        </View>
                        <View style={M.detailRow}>
                          <Text style={M.detailLbl}>Projected Next Year</Text>
                          <Text style={M.detailVal}>{selectedListing.growthProjection.projectedNextYear} tCO₂ (+{selectedListing.growthProjection.percentIncrease}%)</Text>
                        </View>
                        <View style={M.detailRow}>
                          <Text style={M.detailLbl}>3-Year Forecast</Text>
                          <Text style={M.detailVal}>{selectedListing.growthProjection.projectedYear3} tCO₂</Text>
                        </View>

                        <View style={M.investmentOptions}>
                          <View style={M.exPostBox}>
                            <Text style={M.investLabel}>📍 Verified Credits (Ex-Post)</Text>
                            <Text style={M.investValue}>{selectedListing.carbonTons} tCO₂</Text>
                            <Text style={M.investPrice}>${selectedListing.growthProjection.exPostPrice}</Text>
                            <Text style={M.investNote}>Already stored • Low risk</Text>
                          </View>
                          <View style={M.exAnteBox}>
                            <Text style={M.investLabel}>🚀 Future Credits (Ex-Ante)</Text>
                            <Text style={M.investValue}>+{selectedListing.growthProjection.annualNewCarbon} tCO₂/year</Text>
                            <Text style={M.investPrice}>${selectedListing.growthProjection.exAntePrice}</Text>
                            <Text style={M.investNote}>Pre-buy at discount • Higher return</Text>
                          </View>
                        </View>

                        <View style={M.riskWarning}>
                          <Text style={M.riskText}>⚠️ Climate Risk: Cyclones may impact annual growth. A 20% buffer pool insures against losses.</Text>
                        </View>
                      </View>
                    )}

                    {isBuyer && (
                      canBuyListing(selectedListing.confidence) ? (
                        <TouchableOpacity
                          style={M.primaryBtn}
                          onPress={() => { setDetailsModalVisible(false); handleBuyCredits(selectedListing); }}
                        >
                          <Text style={M.primaryBtnText}>Buy Credits</Text>
                          <Ionicons name="arrow-forward" size={16} color="#000" />
                        </TouchableOpacity>
                      ) : (
                        <View style={M.primaryBtnDisabled}>
                          <Ionicons name="close-circle-outline" size={16} color="#163d16" />
                          <Text style={M.primaryBtnDisabledText}>Disabled</Text>
                        </View>
                      )
                    )}
                    <View style={{ height: 24 }} />
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ══════════════ CALCULATOR MODAL ══════════════ */}
        <Modal visible={calculatorModalVisible} transparent animationType="slide" onRequestClose={() => setCalculatorModalVisible(false)}>
          <View style={M.overlay}>
            <View style={M.sheet}>
              <View style={M.handle} />
              <View style={M.sheetHeader}>
                <Text style={M.sheetTitle}>Carbon Calculator</Text>
                <TouchableOpacity style={M.closeBtn} onPress={() => setCalculatorModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#aaa" />
                </TouchableOpacity>
              </View>
              <Text style={M.calcSubtitle}>Estimate your annual carbon footprint</Text>

              {[
                { icon: '✈️', label: 'Flight miles (round trip)', value: flightMiles, setter: setFlightMiles, placeholder: '1 000' },
                { icon: '🚗', label: 'Car miles driven', value: carMiles, setter: setCarMiles, placeholder: '5 000' },
                { icon: '⚡', label: 'Electricity usage (kWh)', value: electricityKwh, setter: setElectricityKwh, placeholder: '3 000' },
              ].map((f) => (
                <View key={f.label} style={M.fieldGroup}>
                  <Text style={M.fieldLabel}>{f.icon}  {f.label}</Text>
                  <TextInput
                    style={M.input}
                    placeholder={f.placeholder}
                    placeholderTextColor="#444"
                    keyboardType="numeric"
                    value={f.value}
                    onChangeText={f.setter}
                  />
                </View>
              ))}

              <TouchableOpacity style={M.primaryBtn} onPress={calculateFootprint}>
                <Text style={M.primaryBtnText}>Calculate</Text>
              </TouchableOpacity>

              {calculatedFootprint && (
                <View style={M.resultCard}>
                  <Text style={M.resultTitle}>Your footprint</Text>
                  <Text style={M.resultBig}>{calculatedFootprint.totalTons} tCO₂</Text>
                  <Text style={M.resultSub}>{calculatedFootprint.totalKg} kg CO₂</Text>
                  <TouchableOpacity style={M.offsetBtn} onPress={buySuggestedAmount}>
                    <Text style={M.offsetBtnText}>
                      Offset now · ${(calculatedFootprint.suggestedTons * 25).toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ height: 24 }} />
            </View>
          </View>
        </Modal>

        {/* ══════════════ WALLET MODAL ══════════════ */}
        <Modal visible={walletModalVisible} transparent animationType="fade" onRequestClose={() => setWalletModalVisible(false)}>
          <View style={M.overlay}>
            <View style={[M.sheet, { maxHeight: height * 0.5 }]}>
              <View style={M.handle} />
              <View style={M.sheetHeader}>
                <Text style={M.sheetTitle}>{hasWallet ? 'Update Wallet' : 'Connect Wallet'}</Text>
                <TouchableOpacity style={M.closeBtn} onPress={() => setWalletModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#aaa" />
                </TouchableOpacity>
              </View>
              {hasWallet && (
                <View style={M.currentWallet}>
                  <Ionicons name="checkmark-circle" size={14} color="#4dff4d" />
                  <Text style={M.currentWalletText}>{walletAddress.slice(0, 8)}…{walletAddress.slice(-6)}</Text>
                </View>
              )}
              <TextInput
                style={M.input}
                placeholder="Solana wallet address"
                placeholderTextColor="#444"
                value={tempWalletInput}
                onChangeText={setTempWalletInput}
                autoCapitalize="none"
              />
              <View style={M.modalBtns}>
                <TouchableOpacity style={M.ghostBtn} onPress={() => { setWalletModalVisible(false); setTempWalletInput(''); }}>
                  <Text style={M.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[M.primaryBtn, { flex: 1, marginTop: 0, marginLeft: 10 }]} onPress={handleSaveWalletAndContinue} disabled={savingWallet}>
                  {savingWallet ? <ActivityIndicator color="#000" /> : <Text style={M.primaryBtnText}>Save & Continue</Text>}
                </TouchableOpacity>
              </View>
              <View style={{ height: 16 }} />
            </View>
          </View>
        </Modal>

        {/* ══════════════ CHECKOUT MODAL ══════════════ */}
        <Modal visible={checkoutVisible} transparent animationType="fade" onRequestClose={() => setCheckoutVisible(false)}>
          <View style={M.overlay}>
            <View style={[M.sheet, { maxHeight: height * 0.6 }]}>
              <View style={M.handle} />
              <View style={M.sheetHeader}>
                <Text style={M.sheetTitle}>Confirm Purchase</Text>
                <TouchableOpacity style={M.closeBtn} onPress={() => setCheckoutVisible(false)}>
                  <Ionicons name="close" size={20} color="#aaa" />
                </TouchableOpacity>
              </View>
              {selectedListing && (
                <>
                  <Text style={M.checkoutProject}>{selectedListing.title}</Text>
                  <View style={M.detailBlock}>
                    {[
                      ['Carbon Credits', `${selectedListing.carbonTons} tCO₂`],
                      ['Price (MATIC)', `${selectedListing.priceMatic} MATIC`],
                      ['Price (USD)', `$${selectedListing.priceUSD}`],
                      ['Your Wallet', hasWallet ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : 'Not connected'],
                    ].map(([lbl, val]) => (
                      <View key={lbl} style={M.detailRow}>
                        <Text style={M.detailLbl}>{lbl}</Text>
                        <Text style={[M.detailVal, lbl === 'Your Wallet' && { color: '#4dff4d', fontSize: 12 }]}>{val}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={M.modalBtns}>
                    <TouchableOpacity style={M.ghostBtn} onPress={() => setCheckoutVisible(false)}>
                      <Text style={M.ghostBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[M.primaryBtn, { flex: 1, marginTop: 0, marginLeft: 10 }]} onPress={placeOrder} disabled={placingOrder}>
                      {placingOrder ? <ActivityIndicator color="#000" /> : <Text style={M.primaryBtnText}>Confirm Buy</Text>}
                    </TouchableOpacity>
                  </View>
                </>
              )}
              <View style={{ height: 16 }} />
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Main Styles ──────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  gradient:   { flex: 1 },
  container:  { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#aaa', marginTop: 12, fontSize: 15 },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 44, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#1a2e1a',
    backgroundColor: 'rgba(10,26,10,0.95)',
  },
  topBarTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  topBarSub:   { fontSize: 11, color: '#6a8a6a', marginTop: 2 },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1a2e1a', borderWidth: 1, borderColor: '#2a4e2a',
    justifyContent: 'center', alignItems: 'center',
  },
  walletChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#1a2e1a', borderWidth: 1, borderColor: '#2a4e2a',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  walletChipConnected: { borderColor: '#4dff4d' },
  walletChipText: { fontSize: 11, fontWeight: '700', color: '#aaa' },
  farmerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#2a1f00', borderWidth: 1, borderColor: '#ffaa0060',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  farmerBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffaa00', letterSpacing: 0.8 },

  kpiRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  kpiCard: {
    flex: 1.15, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#3a6a3a',
    alignItems: 'center', justifyContent: 'center',
  },
  kpiCardAccent: {},
  kpiIcon:  { fontSize: 22, marginBottom: 6 },
  kpiValue: { fontSize: 26, fontWeight: '800', color: '#4dff4d', lineHeight: 30 },
  kpiUnit:  { fontSize: 11, color: '#4dff4d', opacity: 0.7, marginBottom: 4 },
  kpiLabel: { fontSize: 10, color: '#6a9a6a', letterSpacing: 0.5 },
  kpiCol:   { flex: 1, gap: 12 },
  kpiSmall: {
    flex: 1, backgroundColor: '#1a2e1a', borderWidth: 1, borderColor: '#2a4e2a',
    borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center',
  },
  kpiSmallBottom: {},
  kpiSmallValue: { fontSize: 18, fontWeight: '800', color: '#4dff4d' },
  kpiSmallLabel: { fontSize: 10, color: '#6a8a6a', marginTop: 2 },

  treesBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#0f2a0f', borderWidth: 1, borderColor: '#2a4e2a',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  treesIcon: { fontSize: 18 },
  treesText: { fontSize: 12, color: '#aaa' },
  treesHighlight: { color: '#4dff4d', fontWeight: '700' },

  section: { paddingHorizontal: 16, marginTop: 22 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hideFailedText: { color: '#ffaa00', fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  sectionMeta:  { fontSize: 12, color: '#4a7a4a' },
  seeAll: { fontSize: 12, color: '#4dff4d', fontWeight: '600' },

  ordersScroll: { paddingRight: 16, gap: 12 },
  emptyOrders: {
    alignItems: 'center', paddingVertical: 24, gap: 8,
    backgroundColor: '#1a2e1a', borderRadius: 14, borderWidth: 1, borderColor: '#2a4e2a',
  },
  emptyOrdersText: { color: '#4a6a4a', fontSize: 13 },
  orderCard: {
    width: 180, backgroundColor: '#1a2e1a', borderWidth: 1, borderColor: '#2a4e2a',
    borderRadius: 14, padding: 14,
  },
  orderCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderCardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dismissBtn: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#331111', justifyContent: 'center', alignItems: 'center' },
  orderCardTitle: { color: '#fff', fontSize: 12, fontWeight: '700', marginBottom: 6, lineHeight: 16, flex: 1 },
  orderCardDivider: { height: 1, backgroundColor: '#2a4e2a', marginBottom: 10 },
  orderCardStats: { flexDirection: 'row', alignItems: 'center' },
  orderStat: { flex: 1, alignItems: 'center' },
  orderStatVal: { color: '#4dff4d', fontSize: 14, fontWeight: '800' },
  orderStatLbl: { color: '#6a8a6a', fontSize: 9, marginTop: 2 },
  orderStatDivider: { width: 1, height: 24, backgroundColor: '#2a4e2a' },
  certBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginTop: 10, backgroundColor: '#1a3a1a', borderWidth: 1, borderColor: '#4dff4d40',
    borderRadius: 8, paddingVertical: 6,
  },
  certBtnText: { color: '#4dff4d', fontSize: 11, fontWeight: '600' },

  listingsGrid: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  listingCard: {
    backgroundColor: '#111e11', borderWidth: 1, borderColor: '#1f3a1f',
    borderRadius: 16, padding: 16,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeadLeft: { flex: 1, marginRight: 10 },
  cardTitle:  { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 3 },
  cardSeller: { color: '#6a8a6a', fontSize: 11 },
  cardStats:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a1a0a', borderRadius: 10, padding: 10, marginBottom: 10 },
  cardStat:   { flex: 1, alignItems: 'center' },
  cardStatVal: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cardStatLbl: { color: '#6a8a6a', fontSize: 9, marginTop: 2 },
  cardPrice:  { color: '#4dff4d' },
  cardStatDivider: { width: 1, height: 28, backgroundColor: '#1f3a1f' },
  cardLocation: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 10 },
  cardLocationText: { color: '#5a7a5a', fontSize: 11, flex: 1 },
  growthBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a3a1a',
    borderWidth: 1,
    borderColor: '#4dff4d40',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  growthText: { color: '#4dff4d', fontSize: 10, fontWeight: '700' },
  buyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#4dff4d', borderRadius: 10, paddingVertical: 11,
  },
  buyBtnDisabled: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#123112', borderWidth: 1, borderColor: '#2a4e2a',
    borderRadius: 10, paddingVertical: 11, opacity: 0.5,
  },
  buyBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
  lockedPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#1e1800', borderWidth: 1, borderColor: '#ffaa0030',
    borderRadius: 10, paddingVertical: 10,
  },
  lockedPillText: { color: '#ffaa00', fontSize: 12, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:  { fontSize: 40, marginBottom: 12 },
  emptyText:  { color: '#4a6a4a', fontSize: 15 },
});

// ── Modal Styles ─────────────────────────────────────────────────────────────
const M = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0d1c0d', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: '#1f3a1f', paddingHorizontal: 20, paddingTop: 10,
    maxHeight: height * 0.88,
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#2a4e2a',
    borderRadius: 2, alignSelf: 'center', marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#1a2e1a',
    justifyContent: 'center', alignItems: 'center',
  },

  detailHero: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 16, textAlign: 'center' },

  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  confidenceLabel: { color: '#aaa', fontSize: 12, width: 90 },
  barBg: { flex: 1, height: 6, backgroundColor: '#1a2e1a', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  confidenceVal: { fontSize: 12, fontWeight: '700', width: 44, textAlign: 'right' },

  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: {
    flex: 1, backgroundColor: '#1a2e1a', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#2a4e2a',
  },
  chipVal: { color: '#fff', fontSize: 13, fontWeight: '800' },
  chipLbl: { color: '#6a8a6a', fontSize: 9, marginTop: 2 },

  divider: { height: 1, backgroundColor: '#1a3a1a', marginBottom: 14 },

  detailBlock: {
    backgroundColor: '#111e11', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#1f3a1f',
  },
  detailBlockTitle: { fontSize: 12, fontWeight: '700', color: '#4dff4d', marginBottom: 10, letterSpacing: 0.5 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#1a2e1a' },
  detailLbl: { color: '#6a8a6a', fontSize: 13 },
  detailVal: { color: '#fff', fontSize: 13, fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 12 },
  investmentOptions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  exPostBox: {
    flex: 1,
    backgroundColor: '#0f2a0f',
    borderWidth: 1,
    borderColor: '#2a4e2a',
    borderRadius: 10,
    padding: 10,
  },
  exAnteBox: {
    flex: 1,
    backgroundColor: '#132613',
    borderWidth: 1,
    borderColor: '#3a6a3a',
    borderRadius: 10,
    padding: 10,
  },
  investLabel: { color: '#9cb89c', fontSize: 10, marginBottom: 6 },
  investValue: { color: '#fff', fontSize: 13, fontWeight: '700' },
  investPrice: { color: '#4dff4d', fontSize: 16, fontWeight: '800', marginTop: 4 },
  investNote: { color: '#7a9a7a', fontSize: 10, marginTop: 3 },
  riskWarning: {
    marginTop: 12,
    backgroundColor: '#2a1f00',
    borderWidth: 1,
    borderColor: '#ffaa0030',
    borderRadius: 10,
    padding: 10,
  },
  riskText: { color: '#ffcf7a', fontSize: 11, lineHeight: 16 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#4dff4d', borderRadius: 12, paddingVertical: 14, marginTop: 14,
  },
  primaryBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  primaryBtnDisabled: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#123112', borderRadius: 12, paddingVertical: 14, marginTop: 14,
    opacity: 0.7,
  },
  primaryBtnDisabledText: { color: '#5aa95a', fontWeight: '800', fontSize: 15 },

  ghostBtn: {
    flex: 1, backgroundColor: '#1a2e1a', borderWidth: 1, borderColor: '#2a4e2a',
    borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
  },
  ghostBtnText: { color: '#aaa', fontWeight: '700' },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },

  calcSubtitle: { color: '#6a8a6a', fontSize: 13, marginBottom: 16 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { color: '#ccc', fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: '#111e11', borderWidth: 1, borderColor: '#2a4e2a',
    borderRadius: 11, paddingHorizontal: 14, paddingVertical: 13,
    color: '#fff', fontSize: 14,
  },
  resultCard: {
    backgroundColor: '#111e11', borderWidth: 1, borderColor: '#3a6a3a',
    borderRadius: 14, padding: 18, marginTop: 16, alignItems: 'center',
  },
  resultTitle: { color: '#6a8a6a', fontSize: 12, marginBottom: 4 },
  resultBig:   { fontSize: 36, fontWeight: '800', color: '#4dff4d' },
  resultSub:   { color: '#6a8a6a', fontSize: 12, marginTop: 2 },
  offsetBtn: {
    backgroundColor: '#4dff4d', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24, marginTop: 14,
  },
  offsetBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

  currentWallet: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1a3a1a', borderRadius: 8, padding: 10, marginBottom: 12,
  },
  currentWalletText: { color: '#4dff4d', fontSize: 12, fontFamily: 'monospace' },

  checkoutProject: { fontSize: 16, fontWeight: '800', color: '#4dff4d', textAlign: 'center', marginBottom: 14 },
});