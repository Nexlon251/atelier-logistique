import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { askAssistant } from '../services/assistant';
import { Button, Card, Input } from '../components/ui/index';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';

const QUICK_QUESTIONS = [
  'Quels stocks sont critiques ?',
  'Quelles tâches sont en retard ?',
  'Génère un bon de commande',
];

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export function AssistantScreen() {
  const { organization, showToast } = useApp();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  async function handleAsk(question: string) {
    if (!organization) return;
    const trimmed = question.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const reply = await askAssistant(trimmed, organization.id);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: reply,
        },
      ]);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Erreur assistant');
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: 'Désolé, je n’ai pas pu répondre. Réessaie plus tard.',
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Assistant logistique</Text>
        <Text style={styles.subtitle}>Pose une question ou demande un plan d’action rapide.</Text>
      </View>

      <View style={styles.suggestionsRow}>
        {QUICK_QUESTIONS.map((q) => (
          <TouchableOpacity key={q} style={styles.suggestion} onPress={() => handleAsk(q)}>
            <Text style={styles.suggestionText}>{q}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.chatList}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageRow,
              message.role === 'user' ? styles.messageRowRight : styles.messageRowLeft,
            ]}
          >
            <Card style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {message.text}
              </Text>
            </Card>
          </View>
        ))}
        {loading && (
          <View style={styles.messageRowLeft}>
            <Card style={[styles.bubble, styles.assistantBubble]}>
              <Text style={[styles.messageText, styles.assistantText]}>Écris...</Text>
            </Card>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <Input
          placeholder="Pose ta question..."
          value={input}
          onChangeText={setInput}
          returnKeyType="send"
          onSubmitEditing={() => handleAsk(input)}
          style={styles.input}
        />
        <Button
          label="Envoyer"
          onPress={() => handleAsk(input)}
          disabled={!input.trim() || loading}
          loading={loading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: SPACING['2xl'],
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  suggestion: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  suggestionText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  chatList: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING['2xl'],
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: COLORS.white,
  },
  assistantText: {
    color: COLORS.text,
  },
  inputBar: {
    padding: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  input: {
    marginBottom: SPACING.sm,
  },
});
