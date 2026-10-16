import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { Check, Circle } from 'lucide-react-native';
import { theme } from '../../theme';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  date?: string;
  status: 'completed' | 'current' | 'upcoming';
}

export interface TimelineProps extends ViewProps {
  items: TimelineItem[];
}

export function Timeline({ items, style, ...rest }: TimelineProps) {
  return (
    <View style={[styles.container, style]} {...rest}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <View key={item.id} style={styles.itemRow}>
            {/* Indicator column */}
            <View style={styles.indicatorCol}>
              <View
                style={[
                  styles.node,
                  item.status === 'completed' && styles.nodeCompleted,
                  item.status === 'current' && styles.nodeCurrent,
                  item.status === 'upcoming' && styles.nodeUpcoming,
                ]}
              >
                {item.status === 'completed' ? (
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                ) : item.status === 'current' ? (
                  <Circle size={8} color="#FFFFFF" fill="#FFFFFF" />
                ) : (
                  <View style={styles.upcomingDot} />
                )}
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.connectorLine,
                    item.status === 'completed'
                      ? styles.lineCompleted
                      : styles.lineUpcoming,
                  ]}
                />
              )}
            </View>

            {/* Content column */}
            <View style={[styles.contentCol, !isLast && styles.contentColSpacing]}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.title,
                    item.status === 'upcoming' && styles.titleUpcoming,
                  ]}
                >
                  {item.title}
                </Text>
                {(item.date || item.timestamp) && (
                  <Text style={styles.timestamp}>{item.date || item.timestamp}</Text>
                )}
              </View>
              {item.description && (
                <Text style={styles.description}>{item.description}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
  },
  indicatorCol: {
    alignItems: 'center',
    width: 24,
    marginRight: theme.spacing.md,
  },
  node: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCompleted: {
    backgroundColor: theme.colors.success,
  },
  nodeCurrent: {
    backgroundColor: theme.colors.primary600,
  },
  nodeUpcoming: {
    backgroundColor: theme.colors.line,
  },
  upcomingDot: {
    width: 6,
    height: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.ink500,
  },
  connectorLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
  },
  lineCompleted: {
    backgroundColor: theme.colors.success,
  },
  lineUpcoming: {
    backgroundColor: theme.colors.line,
  },
  contentCol: {
    flex: 1,
  },
  contentColSpacing: {
    paddingBottom: theme.spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  title: {
    fontFamily: theme.typography.fonts.uiSemiBold,
    fontSize: theme.typography.styles.small.fontSize,
    lineHeight: theme.typography.styles.small.lineHeight,
    color: theme.colors.ink900,
  },
  titleUpcoming: {
    color: theme.colors.ink500,
  },
  timestamp: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    color: theme.colors.ink500,
    marginLeft: theme.spacing.sm,
  },
  description: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.caption.fontSize,
    lineHeight: 18,
    color: theme.colors.ink700,
    marginTop: 2,
  },
});
