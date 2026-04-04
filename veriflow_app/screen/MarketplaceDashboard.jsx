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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE } from '../config/api';

export default function MarketplaceDashboard({ navigation }) {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState('marketplaceuser');
  const [user, setUser] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');

  const [listings, setListings] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [tempWalletInput, setTempWalletInput] = useState('');
  const [savingWallet, setSavingWallet] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);

  const isBuyer = role === 'marketplaceuser';
  const hasWallet = !!walletAddress;

  const mapProjectToListing = (project) => {
    // Use co2_t_per_ha from your ML results
    const co2PerHectare = Number(project?.mlAnalysisResults?.final_results?.co2_t_per_ha || 0);
    const areaHectares = Number(project.areaHectares || 0);
    const carbonTons = Number((co2PerHectare * areaHectares).toFixed(2));
    const carbonKg = carbonTons * 1000;
    const priceMatic = Number((carbonTons * 10).toFixed(2));
    const priceUSD = Number((carbonTons * 25).toFixed(2));

    return {
      id: project._id,
      title: project.title || 'Untitled Project',
      description: project.description || 'Verified blue carbon credit project',
      ownerId: project.owner?._id || project.owner,
      ownerName: project.owner?.name || 'Unknown Seller',
      location: project.location?.address || project.location || '',
      areaHectares,
      carbonKg,
      carbonTons,
      priceUSD,
      priceMatic,
      status: project.status,
      project,
    };
  };

  const loadSession = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedRole = await AsyncStorage.getItem('role');
      const rawUser = await AsyncStorage.getItem('user');

      let parsedUser = null;
      if (rawUser) {
        try {
          parsedUser = JSON.parse(rawUser);
        } catch (e) {
          parsedUser = null;
        }
      }

      setToken(storedToken || null);
      setRole(storedRole || parsedUser?.role || 'marketplaceuser');
      setUser(parsedUser);
      setWalletAddress(parsedUser?.walletAddress || '');
    } catch (error) {
      console.error('Failed to load session', error);
    }
  }, []);

  const fetchMarketplaceData = useCallback(async (showLoader = false) => {
    if (!token) return;

    if (showLoader) {
      setLoading(true);
    }

    try {
      const projectsRes = await axios.get(`${API_BASE}/api/projects?status=verified`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const verifiedProjects = projectsRes.data?.projects || [];
      setListings(verifiedProjects.map(mapProjectToListing));

      const ordersEndpoint = isBuyer ? '/api/orders/my-orders' : '/api/orders/my-seller-orders';
      const ordersRes = await axios.get(`${API_BASE}${ordersEndpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMyOrders(ordersRes.data?.orders || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Marketplace fetch failed', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load marketplace');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isBuyer]);

  const saveWalletAddress = async (address) => {
    try {
      setSavingWallet(true);
      const response = await axios.patch(
        `${API_BASE}/api/orders/update-wallet`,
        { walletAddress: address },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setWalletAddress(address);
        // Update stored user
        if (user) {
          const updatedUser = { ...user, walletAddress: address };
          setUser(updatedUser);
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Save wallet error:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to save wallet');
      return false;
    } finally {
      setSavingWallet(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!token) return;
    fetchMarketplaceData(true);
  }, [token, fetchMarketplaceData]);

  useEffect(() => {
    if (!token) return;
    const intervalId = setInterval(() => {
      fetchMarketplaceData(false);
    }, 15000);
    return () => clearInterval(intervalId);
  }, [token, fetchMarketplaceData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMarketplaceData(false);
  };

  const getNextStepText = (order) => {
    const status = String(order?.status || '').toLowerCase();
    if (status === 'pending') return '⏳ Next step: Wait for admin approval and token transfer.';
    if (status === 'approved') return '✅ Next step: Transaction is being processed.';
    if (status === 'completed') return '🎉 Credits delivered to your wallet!';
    if (status === 'failed' || status === 'cancelled') return '❌ Contact admin for support.';
    return '📦 Track order status updates.';
  };

  const handleBuyCredits = async (listing) => {
    if (!isBuyer) {
      Alert.alert('View Only', 'Farmers can view listings but cannot buy credits.');
      return;
    }

    // If no wallet address, show wallet modal first
    if (!hasWallet) {
      setSelectedListing(listing);
      setWalletModalVisible(true);
      return;
    }

    setSelectedListing(listing);
    setCheckoutVisible(true);
  };

  const handleSaveWalletAndContinue = async () => {
    if (!tempWalletInput.trim()) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }

    const saved = await saveWalletAddress(tempWalletInput.trim());
    if (saved && selectedListing) {
      setWalletModalVisible(false);
      setTempWalletInput('');
      setCheckoutVisible(true);
    }
  };

  const placeOrder = async () => {
    if (!selectedListing) return;

    try {
      setPlacingOrder(true);
      await axios.post(
        `${API_BASE}/api/orders/create`,
        {
          projectId: selectedListing.id,
          sellerId: selectedListing.ownerId,
          carbonKg: selectedListing.carbonKg,
          carbonTons: selectedListing.carbonTons,
          priceMatic: selectedListing.priceMatic,
          priceUSD: selectedListing.priceUSD,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setCheckoutVisible(false);
      setSelectedListing(null);
      Alert.alert('Success', 'Purchase request submitted successfully!');
      await fetchMarketplaceData(false);
    } catch (err) {
      Alert.alert('Purchase Failed', err?.response?.data?.message || 'Unable to create order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const totals = useMemo(() => {
    if (!myOrders.length) {
      return {
        totalCreditsTons: 0,
        totalValueUSD: 0,
      };
    }

    const totalCreditsTons = myOrders.reduce((sum, order) => sum + Number(order?.amount?.carbonTons || 0), 0);
    const totalValueUSD = myOrders.reduce((sum, order) => sum + Number(order?.amount?.priceUSD || 0), 0);

    return {
      totalCreditsTons: Number(totalCreditsTons.toFixed(2)),
      totalValueUSD: Number(totalValueUSD.toFixed(2)),
    };
  }, [myOrders]);

  if (loading) {
    return (
      <LinearGradient
        colors={['#0d1f0d', '#0f2a0f']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#4dff4d" />
            <Text style={styles.loadingText}>Loading marketplace...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0d1f0d', '#0f2a0f']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Carbon Marketplace</Text>
            <Text style={styles.subtitle}>
              {listings.length} Verified Credits • {isBuyer ? 'Buyer Mode' : 'Farmer View'}
            </Text>
          </View>

          {isBuyer && (
            <TouchableOpacity
              style={[styles.walletButton, hasWallet && styles.walletConnected]}
              onPress={() => setWalletModalVisible(true)}
            >
              <Text style={styles.walletButtonText}>
                {hasWallet 
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` 
                  : 'Add Wallet'}
              </Text>
            </TouchableOpacity>
          )}

          {!isBuyer && (
            <View style={styles.viewOnlyBadge}>
              <Text style={styles.viewOnlyText}>VIEW ONLY</Text>
            </View>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{isBuyer ? 'My Purchases' : 'My Sales'}</Text>
            <Text style={styles.statValue}>{myOrders.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{isBuyer ? 'Total Credits' : 'Credits Sold'}</Text>
            <Text style={styles.statValue}>{totals.totalCreditsTons} tCO₂</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{isBuyer ? 'Total Spent' : 'Total Earned'}</Text>
            <Text style={styles.statValue}>${totals.totalValueUSD}</Text>
          </View>
        </View>

        {/* Live Updates Indicator */}
        <Text style={styles.liveText}>
          🔄 Live updates every 15s {lastUpdated ? `• Last sync ${lastUpdated.toLocaleTimeString()}` : ''}
        </Text>

        {/* My Orders Section */}
        <View style={styles.ordersSection}>
          <Text style={styles.ordersSectionTitle}>
            {isBuyer ? '📋 My Purchase Orders' : '📋 Orders on My Credits'}
          </Text>
          {myOrders.length === 0 ? (
            <View style={styles.ordersEmptyCard}>
              <Text style={styles.ordersEmptyText}>
                {isBuyer 
                  ? 'No orders yet. Browse credits below and click "Buy" to get started.' 
                  : 'No sales yet. Buyers will purchase your verified credits here.'}
              </Text>
            </View>
          ) : (
            myOrders.slice(0, 5).map((order) => (
              <View key={order._id} style={styles.orderCard}>
                <View style={styles.orderTopRow}>
                  <Text style={styles.orderTitle} numberOfLines={1}>
                    {order?.project?.title || 'Carbon Credit Order'}
                  </Text>
                  <Text style={[styles.orderStatus, styles[`orderStatus${order?.status}`]]}>
                    {String(order?.status || 'pending').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.orderMeta}>🌿 Credits: {Number(order?.amount?.carbonTons || 0).toFixed(2)} tCO₂</Text>
                <Text style={styles.orderMeta}>💰 Amount: ${Number(order?.amount?.priceUSD || 0).toFixed(2)}</Text>
                <Text style={styles.orderNextStep}>{getNextStepText(order)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Available Credits Section (Listings) */}
        <View style={styles.listingsHeader}>
          <Text style={styles.listingsTitle}>🌱 Available Carbon Credits</Text>
          <Text style={styles.listingsSubtitle}>Verified projects ready for purchase</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4dff4d"
              colors={['#4dff4d']}
            />
          }
        >
          {listings.length > 0 ? (
            listings.map((listing) => (
              <View key={listing.id} style={styles.listingCard}>
                <View style={styles.listingHeader}>
                  <Text style={styles.listingTitle}>{listing.title}</Text>
                  <Text style={styles.listingPrice}>{listing.priceMatic} MATIC</Text>
                </View>

                <Text style={styles.listingDesc} numberOfLines={2}>
                  {listing.description}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>👨‍🌾 Seller: {listing.ownerName}</Text>
                  <Text style={styles.metaText}>📏 Area: {listing.areaHectares} ha</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>🌿 Credits: {listing.carbonTons} tCO₂</Text>
                  <Text style={styles.metaText}>💵 ~${listing.priceUSD}</Text>
                </View>
                {listing.location ? (
                  <Text style={styles.metaLocation}>📍 {listing.location}</Text>
                ) : null}

                {isBuyer ? (
                  <TouchableOpacity
                    style={styles.buyButton}
                    onPress={() => handleBuyCredits(listing)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.buyButtonText}>Buy Credits →</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.viewOnlyPill}>
                    <Text style={styles.viewOnlyPillText}>🔒 Purchase disabled (Farmer View)</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🌍</Text>
              <Text style={styles.emptyStateText}>No verified credits available yet</Text>
              <Text style={styles.emptyStateSubtext}>Check back soon for new listings</Text>
            </View>
          )}
        </ScrollView>

        {/* Wallet Address Modal */}
        <Modal
          visible={walletModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setWalletModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {hasWallet ? 'Update Wallet Address' : 'Add Wallet Address'}
              </Text>
              <Text style={styles.modalSubtitle}>
                Enter your Solana or Ethereum wallet address to receive carbon credits
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0x... or Solana address..."
                placeholderTextColor="#666"
                value={tempWalletInput || walletAddress}
                onChangeText={setTempWalletInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setWalletModalVisible(false);
                    setTempWalletInput('');
                    setSelectedListing(null);
                  }}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={selectedListing ? handleSaveWalletAndContinue : async () => {
                    if (tempWalletInput) {
                      await saveWalletAddress(tempWalletInput);
                      setWalletModalVisible(false);
                      setTempWalletInput('');
                    }
                  }}
                  disabled={savingWallet}
                >
                  <Text style={styles.modalButtonSaveText}>
                    {savingWallet ? 'Saving...' : (selectedListing ? 'Save & Continue' : 'Save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Checkout Confirmation Modal */}
        <Modal
          visible={checkoutVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCheckoutVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirm Purchase</Text>

              {selectedListing ? (
                <>
                  <View style={styles.checkoutDetails}>
                    <Text style={styles.checkoutProjectTitle}>{selectedListing.title}</Text>
                    <View style={styles.checkoutRow}>
                      <Text style={styles.checkoutLabel}>Seller:</Text>
                      <Text style={styles.checkoutValue}>{selectedListing.ownerName}</Text>
                    </View>
                    <View style={styles.checkoutRow}>
                      <Text style={styles.checkoutLabel}>Credits:</Text>
                      <Text style={styles.checkoutValue}>{selectedListing.carbonTons} tCO₂</Text>
                    </View>
                    <View style={styles.checkoutRow}>
                      <Text style={styles.checkoutLabel}>Price:</Text>
                      <Text style={styles.checkoutValue}>{selectedListing.priceMatic} MATIC (${selectedListing.priceUSD})</Text>
                    </View>
                    <View style={styles.checkoutRow}>
                      <Text style={styles.checkoutLabel}>Your Wallet:</Text>
                      <Text style={styles.checkoutValueWallet}>
                        {walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}` : 'Not set'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonCancel]}
                      onPress={() => setCheckoutVisible(false)}
                      disabled={placingOrder}
                    >
                      <Text style={styles.modalButtonCancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonConfirm]}
                      onPress={placeOrder}
                      disabled={placingOrder}
                    >
                      {placingOrder ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.modalButtonConfirmText}>Confirm Order</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0a1a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a2e1a',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#aaaaaa',
  },
  walletButton: {
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#4dff4d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  walletConnected: {
    borderColor: '#4dff4d',
    backgroundColor: '#1a3a1a',
  },
  walletButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4dff4d',
  },
  viewOnlyBadge: {
    backgroundColor: '#1a2e1a',
    borderColor: '#ffaa00',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  viewOnlyText: {
    color: '#ffaa00',
    fontWeight: '700',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#2a3e2a',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  statLabel: {
    color: '#aaaaaa',
    fontSize: 11,
    marginBottom: 6,
  },
  statValue: {
    color: '#4dff4d',
    fontSize: 16,
    fontWeight: '800',
  },
  liveText: {
    color: '#aaaaaa',
    fontSize: 11,
    marginTop: 10,
    marginHorizontal: 20,
  },
  ordersSection: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  ordersSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  ordersEmptyCard: {
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#2a3e2a',
    borderRadius: 12,
    padding: 12,
  },
  ordersEmptyText: {
    color: '#aaaaaa',
    fontSize: 12,
  },
  orderCard: {
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#2a3e2a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  orderTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  orderStatus: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  orderStatuspending: {
    color: '#ffaa00',
    backgroundColor: '#332200',
  },
  orderStatusapproved: {
    color: '#4dff4d',
    backgroundColor: '#1a3a1a',
  },
  orderStatuscompleted: {
    color: '#00ffaa',
    backgroundColor: '#1a3a2a',
  },
  orderStatuscancelled: {
    color: '#ff4444',
    backgroundColor: '#331111',
  },
  orderStatusfailed: {
    color: '#ff4444',
    backgroundColor: '#331111',
  },
  orderMeta: {
    color: '#aaaaaa',
    fontSize: 11,
    marginBottom: 2,
  },
  orderNextStep: {
    color: '#dddddd',
    fontSize: 11,
    marginTop: 4,
  },
  listingsHeader: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  listingsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  listingsSubtitle: {
    color: '#aaaaaa',
    fontSize: 12,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  listingCard: {
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#2a3e2a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    paddingRight: 12,
  },
  listingPrice: {
    color: '#4dff4d',
    fontSize: 14,
    fontWeight: '800',
  },
  listingDesc: {
    color: '#dddddd',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  metaText: {
    color: '#aaaaaa',
    fontSize: 11,
    flex: 1,
  },
  metaLocation: {
    color: '#aaaaaa',
    fontSize: 11,
    marginTop: 2,
    marginBottom: 10,
  },
  buyButton: {
    backgroundColor: '#4dff4d',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buyButtonText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 14,
  },
  viewOnlyPill: {
    backgroundColor: '#142514',
    borderWidth: 1,
    borderColor: '#2a3e2a',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  viewOnlyPillText: {
    color: '#ffaa00',
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#aaaaaa',
    marginTop: 12,
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#aaaaaa',
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#777777',
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#0a1a0a',
    borderWidth: 1,
    borderColor: '#2a3e2a',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#aaaaaa',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#2a3e2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#2a3e2a',
  },
  modalButtonCancelText: {
    color: '#aaaaaa',
    fontWeight: '700',
  },
  modalButtonSave: {
    backgroundColor: '#2a5e2a',
    borderWidth: 1,
    borderColor: '#4dff4d',
  },
  modalButtonSaveText: {
    color: '#4dff4d',
    fontWeight: '700',
  },
  modalButtonConfirm: {
    backgroundColor: '#4dff4d',
  },
  modalButtonConfirmText: {
    color: '#000000',
    fontWeight: '800',
  },
  checkoutDetails: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#1a2e1a',
    borderRadius: 12,
  },
  checkoutProjectTitle: {
    color: '#4dff4d',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  checkoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  checkoutLabel: {
    color: '#aaaaaa',
    fontSize: 13,
  },
  checkoutValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  checkoutValueWallet: {
    color: '#4dff4d',
    fontSize: 11,
    fontWeight: '600',
  },
});