// MessageBubble — React Native primitives only. CLAUDE.md §4.
// FounderCounsel chat message display.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens/colors';

export interface CitationRef {
  regulation: string;
  section: string;
  url?: string;
}

export interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: CitationRef[];
  timestamp?: Date;
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function MessageBubble({
  role,
  content,
  citations,
  timestamp,
}: MessageBubbleProps): React.JSX.Element {
  const isUser = role === 'user';

  const styles = StyleSheet.create({
    wrapper: {
      flexDirection: 'row' as const,
      justifyContent: isUser ? 'flex-end' : ('flex-start' as const),
      marginVertical: 4,
      paddingHorizontal: 12,
    },
    bubble: {
      maxWidth: '80%' as const,
      borderRadius: 16,
      padding: 12,
      backgroundColor: isUser ? colors.klarifyTeal : colors.white,
      borderWidth: isUser ? 0 : 1,
      borderColor: colors.borderGrey,
      // Tail positioning
      borderBottomRightRadius: isUser ? 4 : 16,
      borderBottomLeftRadius: isUser ? 16 : 4,
    },
    contentText: {
      fontSize: 14,
      color: isUser ? colors.white : colors.textPrimary,
      lineHeight: 20,
    },
    timestamp: {
      fontSize: 10,
      color: isUser ? colors.bgTeal : colors.textLight,
      marginTop: 4,
      alignSelf: isUser ? ('flex-end' as const) : ('flex-start' as const),
    },
    citationsWrapper: {
      marginTop: 8,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 4,
    },
    citationPill: {
      backgroundColor: colors.bgTeal,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    citationText: {
      fontSize: 10,
      color: colors.klarifyTeal,
      fontWeight: '500' as const,
    },
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.bubble}>
        <Text style={styles.contentText}>{content}</Text>
        {timestamp !== undefined ? (
          <Text style={styles.timestamp}>{formatTime(timestamp)}</Text>
        ) : null}
        {!isUser && citations !== undefined && citations.length > 0 ? (
          <View style={styles.citationsWrapper}>
            {citations.map((c, i) => (
              <View key={i} style={styles.citationPill}>
                <Text style={styles.citationText}>
                  {c.regulation} {c.section}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
