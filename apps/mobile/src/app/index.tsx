import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CATEGORIES } from '@campaigns/shared';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Campaigns</Text>
      <Text style={styles.subtitle}>Community-funded ad campaigns</Text>
      <Text style={styles.categoriesCount}>{CATEGORIES.length} Categories loaded</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 16,
  },
  categoriesCount: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
});
