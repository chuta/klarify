import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { colors } from '@klarify/ui/tokens';
import { supabase } from '../src/lib/supabase';

/**
 * Home screen — the post-auth landing point.
 *
 * Sprint 0: shows a minimal scaffold so we can confirm the full
 * sign-in → deep link → home flow works end-to-end on device.
 * Readiness Score, Roadmap, and FounderCounsel ship in Sprint 1+.
 *
 * Auth guard lives in _layout.tsx — if this screen renders, the user
 * is already authenticated. `supabase.auth.getUser()` here is a
 * belt-and-suspenders check.
 */
export default function HomeScreen(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });
  }, []);

  async function handleSignOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error signing out', error.message);
    }
    // _layout.tsx onAuthStateChange → protectedRedirect sends to /sign-in
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Klarify</Text>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      {/* Welcome */}
      <View style={styles.body}>
        <Text style={styles.welcome}>Welcome back 👋</Text>
        {user?.email ? (
          <Text style={styles.email}>{user.email}</Text>
        ) : null}

        {/* Sprint 0 placeholder cards */}
        <PlaceholderCard
          title="Regulatory Readiness Score"
          description="Your live 0–100 compliance gauge. Complete onboarding to calculate your first score."
          color={colors.klarifyTeal}
        />
        <PlaceholderCard
          title="Smart Compliance Roadmap"
          description="Personalised 4-phase roadmap to full regulatory readiness. Unlocks after onboarding."
          color={colors.klarifyNavy}
        />
        <PlaceholderCard
          title="FounderCounsel AI"
          description="Ask any Nigerian regulatory question in plain English and get cited answers."
          color={colors.klarifyGold}
        />

        <Text style={styles.sprintNote}>
          Sprint 0 scaffold — full dashboard ships in Sprint 1.
        </Text>
      </View>
    </View>
  );
}

interface PlaceholderCardProps {
  title: string;
  description: string;
  color: string;
}

function PlaceholderCard({ title, description, color }: PlaceholderCardProps): JSX.Element {
  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
      <View style={styles.comingSoonBadge}>
        <Text style={styles.comingSoonText}>Coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGrey,
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.klarifyTeal,
  },
  signOutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderGrey,
  },
  signOutText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  email: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderGrey,
  },
  cardAccent: {
    height: 3,
    width: 32,
    borderRadius: 2,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  comingSoonBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.bgGrey,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  comingSoonText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sprintNote: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 11,
    color: colors.textLight,
  },
});
