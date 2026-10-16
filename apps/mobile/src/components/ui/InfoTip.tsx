import React, { useState } from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Sheet } from './Sheet';
import { theme } from '../../theme';

export type InfoTipPresetKey =
  | 'estimatedReach'
  | 'platformFee'
  | 'useOfFunds'
  | 'reviewProcess'
  | 'cpmAndImpressions'
  | 'fundingVsPromotion';

const PRESETS: Record<InfoTipPresetKey, { title: string; content: string }> = {
  estimatedReach: {
    title: 'How Estimated Reach Works',
    content:
      'Estimated reach is calculated using standard advertising pricing assumptions ($6.00 CPM, 2.2 average frequency). Because real ad inventory, bidding competition, and channel performance fluctuate dynamically, reach is an illustrative estimate—never a guaranteed audience size.',
  },
  platformFee: {
    title: 'Platform Fee & Costs',
    content:
      'A 10% platform fee is deducted from contributions to cover fact-checking, human review, compliance, platform hosting, and payment infrastructure. The remaining 90% goes directly into an advertising budget managed exclusively for campaign distribution.',
  },
  useOfFunds: {
    title: 'Use of Funds & "Not a Donation"',
    content:
      'Contributions to Campaigns fund advertising distribution to spread the campaign message to external audiences. Funds are never paid out as direct charitable donations or cash gifts to the creator or the cause itself.',
  },
  reviewProcess: {
    title: 'Review & Verification',
    content:
      'Before a campaign can receive contributions, our team checks the story, examines supporting citations, verifies ad assets, and reviews targeting settings. Only campaigns passing review are published for funding.',
  },
  cpmAndImpressions: {
    title: 'CPM & Ad Impressions',
    content:
      'CPM stands for "Cost Per Mille" (cost per 1,000 ad impressions). In our demonstration model, $6.00 delivers 1,000 ad impressions. With an average frequency of 2.2 views per person, $1 of ad budget reaches approximately 68 unique people.',
  },
  fundingVsPromotion: {
    title: 'Funding vs. Active Promotion',
    content:
      'Reaching the funding goal marks the successful end of the contribution period. Advertising distribution begins after payment settlement and campaign setup verification in distribution preparation.',
  },
};

export interface InfoTipProps {
  term?: InfoTipPresetKey;
  title?: string;
  content?: string | React.ReactNode;
  size?: number;
  color?: string;
}

export function InfoTip({
  term,
  title,
  content,
  size = 18,
  color = theme.colors.ink500,
}: InfoTipProps) {
  const [open, setOpen] = useState(false);

  const preset = term ? PRESETS[term] : undefined;
  const sheetTitle = title || preset?.title || 'Information';
  const sheetContent = content || preset?.content;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setOpen(true);
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={`Info: ${sheetTitle}`}
        style={styles.tipButton}
      >
        <Info size={size} color={color} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={sheetTitle}>
        <View style={styles.sheetBody}>
          {typeof sheetContent === 'string' ? (
            <Text style={styles.sheetText}>{sheetContent}</Text>
          ) : (
            sheetContent
          )}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  tipButton: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    paddingVertical: theme.spacing.xs,
  },
  sheetText: {
    fontFamily: theme.typography.fonts.uiRegular,
    fontSize: theme.typography.styles.body.fontSize,
    lineHeight: theme.typography.styles.body.lineHeight,
    color: theme.colors.ink700,
  },
});
