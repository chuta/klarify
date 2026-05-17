// RegulatoryIdentityCard — React Native primitives only. CLAUDE.md §4.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens/colors';

export interface RegulatoryIdentityCardProps {
  productTypes: string[];
  primaryRegulator: string;
  requiredLicences: string[];
  stage: string;
}

export function RegulatoryIdentityCard({
  productTypes,
  primaryRegulator,
  requiredLicences,
  stage,
}: RegulatoryIdentityCardProps): React.JSX.Element {
  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.white,
      borderRadius: 12,
      overflow: 'hidden' as const,
      borderWidth: 1,
      borderColor: colors.borderGrey,
    },
    header: {
      backgroundColor: colors.klarifyTeal,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: {
      fontSize: 12,
      color: colors.bgTeal,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
    headerSubtitle: {
      fontSize: 18,
      color: colors.white,
      fontWeight: '700' as const,
      marginTop: 2,
    },
    body: {
      padding: 16,
    },
    section: {
      marginBottom: 14,
    },
    sectionLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
      marginBottom: 6,
    },
    pillRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 6,
    },
    pill: {
      backgroundColor: colors.bgTeal,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pillText: {
      fontSize: 12,
      color: colors.klarifyTeal,
      fontWeight: '600' as const,
    },
    licencePill: {
      backgroundColor: colors.bgNavy,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    licencePillText: {
      fontSize: 12,
      color: colors.klarifyNavy,
      fontWeight: '600' as const,
    },
    regulatorText: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '500' as const,
    },
    stageText: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '500' as const,
      textTransform: 'capitalize' as const,
    },
  });

  const formattedProductTypes = productTypes.join(' · ');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Regulatory Identity</Text>
        <Text style={styles.headerSubtitle}>{formattedProductTypes}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Primary Regulator</Text>
          <Text style={styles.regulatorText}>{primaryRegulator}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Required Licences</Text>
          <View style={styles.pillRow}>
            {requiredLicences.map((licence) => (
              <View key={licence} style={styles.licencePill}>
                <Text style={styles.licencePillText}>{licence}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Current Stage</Text>
          <Text style={styles.stageText}>{stage}</Text>
        </View>
      </View>
    </View>
  );
}
