import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '@klarify/ui/tokens';
import { supabase } from '../src/lib/supabase';

type State = 'idle' | 'loading' | 'sent';

/**
 * /sign-in — magic-link email capture (mobile).
 *
 * Mirrors apps/web/src/app/sign-in/page.tsx for a consistent UX.
 * On success the user receives an email. Tapping the link opens the
 * klarify:// deep link scheme which is handled in _layout.tsx.
 */
export default function SignInScreen(): JSX.Element {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');

  async function handleSend(): Promise<void> {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setState('loading');

    const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${apiUrl}/auth/callback`,
        // shouldCreateUser: false ← uncomment to restrict to existing users
      },
    });

    if (error) {
      setState('idle');
      Alert.alert('Error', error.message);
      return;
    }

    setState('sent');
  }

  if (state === 'sent') {
    return (
      <View style={[styles.container, styles.centred]}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>✉️</Text>
        </View>
        <Text style={styles.heading}>Check your inbox</Text>
        <Text style={styles.body}>
          We sent you a magic link. Tap it to sign in — no password needed.
          The link expires in 60 minutes.
        </Text>
        <Pressable style={styles.linkButton} onPress={() => setState('idle')}>
          <Text style={styles.linkButtonText}>Use a different email</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={20}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <Text style={styles.logo}>Klarify</Text>
        <Text style={styles.tagline}>Navigate Regulated Markets with Confidence</Text>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.heading}>Sign in</Text>
          <Text style={styles.body}>Enter your email — we&apos;ll send you a magic link.</Text>

          <TextInput
            style={styles.input}
            placeholder="you@company.com"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={state !== 'loading'}
          />

          <Pressable
            style={[styles.button, state === 'loading' && styles.buttonDisabled]}
            onPress={handleSend}
            disabled={state === 'loading'}
          >
            {state === 'loading' ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Send magic link</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.legalNote}>
          By signing in you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  centred: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.klarifyTeal,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.borderGrey,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 20,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderGrey,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 14,
    backgroundColor: colors.bgPrimary,
  },
  button: {
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.klarifyTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  legalNote: {
    marginTop: 24,
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.bgTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconEmoji: {
    fontSize: 28,
  },
  linkButton: {
    marginTop: 20,
    paddingVertical: 8,
  },
  linkButtonText: {
    color: colors.klarifyTeal,
    fontSize: 14,
    fontWeight: '500',
  },
});
