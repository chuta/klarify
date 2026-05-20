import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChatInterface } from '@/components/chat/ChatInterface';

/**
 * /dashboard/chat — FounderCounsel AI Advisory
 *
 * Server component gates on auth, then hands off to the client-side
 * ChatInterface which owns the SSE stream + sidebar state.
 *
 * The page itself is full-bleed (no max-w wrapper) so the chat column
 * can fill the available height; the dashboard layout's padding is
 * neutralised by overriding the inner ChatInterface min-height.
 */
export default async function ChatPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect('/sign-in');

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      <ChatInterface />
    </div>
  );
}
