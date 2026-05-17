// RegulatorProfile — React Native primitives only. CLAUDE.md §4.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../tokens/colors';

export interface RegulatorInfo {
  code: string;
  name: string;
  mandate: string;
  website: string;
  email?: string;
  phone?: string;
  jurisdiction_tags: readonly string[];
}

export interface RegulatorProfileProps {
  regulator: RegulatorInfo;
  onPress?: () => void;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderGrey,
    overflow: 'hidden' as const,
  },
  headerBar: {
    backgroundColor: colors.klarifyNavy,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  codeText: {
    fontSize: 12,
    color: colors.bgNavy,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  nameText: {
    fontSize: 15,
    color: colors.white,
    fontWeight: '700' as const,
    flex: 1,
    marginRight: 8,
  },
  chevronText: {
    color: colors.bgNavy,
    fontSize: 16,
  },
  body: {
    padding: 16,
  },
  mandateText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  contactLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600' as const,
    width: 52,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  contactValue: {
    fontSize: 12,
    color: colors.klarifyTeal,
    flex: 1,
  },
  tagsSection: {
    marginTop: 12,
  },
  tagsLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  tagPill: {
    backgroundColor: colors.bgGrey,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
});

export function RegulatorProfile({
  regulator,
  onPress,
}: RegulatorProfileProps): React.JSX.Element {
  const cardContent = (
    <View style={styles.card}>
      <View style={styles.headerBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.codeText}>{regulator.code}</Text>
          <Text style={styles.nameText}>{regulator.name}</Text>
        </View>
        {onPress !== undefined ? (
          <Text style={styles.chevronText}>›</Text>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.mandateText}>{regulator.mandate}</Text>
        {regulator.website.length > 0 ? (
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Web</Text>
            <Text style={styles.contactValue}>{regulator.website}</Text>
          </View>
        ) : null}
        {regulator.email !== undefined ? (
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>{regulator.email}</Text>
          </View>
        ) : null}
        {regulator.phone !== undefined ? (
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactValue}>{regulator.phone}</Text>
          </View>
        ) : null}
        {regulator.jurisdiction_tags.length > 0 ? (
          <View style={styles.tagsSection}>
            <Text style={styles.tagsLabel}>Jurisdiction Tags</Text>
            <View style={styles.tagsRow}>
              {regulator.jurisdiction_tags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (onPress !== undefined) {
    return <Pressable onPress={onPress}>{cardContent}</Pressable>;
  }

  return cardContent;
}
