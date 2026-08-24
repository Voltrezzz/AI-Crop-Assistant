import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

type ChatHistoryMessage = { role: string; content?: string; text?: string };
type ChatUserContext = {
  name?: string;
  location?: string;
  state?: string;
  profileType?: string;
};

export const isGeminiConfigured = () => isSupabaseConfigured();

export const chatWithGemini = async (
  message: string,
  history: ChatHistoryMessage[] = [],
  language = 'English',
  userContext: ChatUserContext = {},
): Promise<string> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Gemini chat requires the Marudham 360 cloud service.');
  }

  const { data, error } = await getSupabaseClient().functions.invoke('gemini-chat', {
    body: {
      message: message.trim(),
      history: history.slice(-16).map(item => ({
        role: item.role,
        content: item.content || item.text || '',
      })),
      language,
      userContext,
    },
  });

  if (error) throw new Error(error.message || 'The Gemini proxy request failed.');
  if (data?.error) throw new Error(String(data.error));
  if (typeof data?.text !== 'string' || !data.text.trim()) {
    throw new Error('Gemini returned an empty response.');
  }
  return data.text;
};
