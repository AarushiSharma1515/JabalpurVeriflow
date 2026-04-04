import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform } from 'react-native';

export default function NFTCard({ nft, onPress, isWalletConnected }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(nft)}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: nft.image }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {nft.name}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {nft.description}
        </Text>

        {isWalletConnected ? (
          <>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Price</Text>
              <View style={styles.priceWrapper}>
                <Text style={styles.priceValue}>{nft.price}</Text>
                <Text style={styles.currency}>{nft.currency || 'ETH'}</Text>
              </View>
            </View>

            {nft.seller && (
              <View style={styles.sellerContainer}>
                <Text style={styles.sellerLabel}>Seller</Text>
                <Text style={styles.sellerAddress} numberOfLines={1}>
                  {nft.seller}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.connectPrompt}>
            <Text style={styles.connectPromptText}>
              Connect wallet to view details
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  priceContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  priceWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5A7FE2',
    marginRight: 6,
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5A7FE2',
  },
  sellerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  sellerLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  sellerAddress: {
    fontSize: 13,
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  connectPrompt: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  connectPromptText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
  },
});
