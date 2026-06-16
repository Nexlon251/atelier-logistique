import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Badge } from './ui/index';
import { COLORS } from './ui/theme';

export function AlertsBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View style={styles.wrapper}>
      <Badge label={count > 9 ? '9+' : String(count)} bg={COLORS.danger} color={COLORS.white} size="sm" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
