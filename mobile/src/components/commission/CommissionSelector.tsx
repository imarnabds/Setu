import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ViewStyle,
  Animated
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { Icon } from '../common/Icon';

// The 21 discrete values in 2.5% increments from 0% to 50%
export const COMMISSION_STEPS = [
  0.0, 2.5, 5.0, 7.5, 10.0, 12.5, 15.0, 17.5, 20.0, 22.5, 25.0,
  27.5, 30.0, 32.5, 35.0, 37.5, 40.0, 42.5, 45.0, 47.5, 50.0
];

interface CommissionSelectorProps {
  initialRate?: number;
  initialBasis?: string;
  onSave: (rate: number, basis: string, reason?: string) => Promise<void>;
  onReset?: () => void;
  style?: ViewStyle;
}

export const CommissionSelector: React.FC<CommissionSelectorProps> = ({
  initialRate = 5.0,
  initialBasis = 'Commission on Listing Profit',
  onSave,
  onReset,
  style
}) => {
  const [rate, setRate] = useState<number>(initialRate);
  const [basis, setBasis] = useState<string>('Commission on Listing Profit');
  const [reason, setReason] = useState<string>('');
  const [sampleProfit, setSampleProfit] = useState<string>('10000');
  const [saving, setSaving] = useState(false);

  // Stepping helpers in 2.5% increments
  const handleStepDown = () => {
    const currentIndex = COMMISSION_STEPS.indexOf(rate);
    if (currentIndex > 0) {
      setRate(COMMISSION_STEPS[currentIndex - 1]);
    }
  };

  const handleStepUp = () => {
    const currentIndex = COMMISSION_STEPS.indexOf(rate);
    if (currentIndex < COMMISSION_STEPS.length - 1) {
      setRate(COMMISSION_STEPS[currentIndex + 1]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(rate, basis, reason);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setRate(5.0);
    setBasis('Commission on Listing Profit');
    setReason('');
    if (onReset) onReset();
  };

  // Live profit calculation demonstration
  const numProfit = parseFloat(sampleProfit) || 0;
  const calculatedCommission = Math.round((numProfit * (rate / 100)) * 100) / 100;
  const investorNetProfit = Math.max(0, Math.round((numProfit - calculatedCommission) * 100) / 100);

  // Rate tier description & badge styling
  const getRateTierInfo = () => {
    if (rate === 0) {
      return { label: '0.0% — Pro Bono / Zero Commission', bg: '#F1F5F9', color: '#64748B' };
    }
    if (rate <= 5) {
      return { label: 'Competitive Profit Margin (2.5% – 5.0%)', bg: '#ECFDF5', color: '#10B981' };
    }
    if (rate <= 15) {
      return { label: 'Standard Profit Sharing (7.5% – 15.0%)', bg: '#EEF4FE', color: '#246BFD' };
    }
    if (rate <= 30) {
      return { label: 'High Demand Allocation (17.5% – 30.0%)', bg: '#FFFBEB', color: '#D97706' };
    }
    return { label: 'Premium / High-Alpha Tier (32.5% – 50.0%)', bg: '#FEF2F2', color: '#DC2626' };
  };

  const tierInfo = getRateTierInfo();

  // Progress percentage (0% to 50% mapped to 0% - 100%)
  const progressRatio = (rate / 50) * 100;

  return (
    <View style={[styles.container, style]}>
      {/* ------------------------------------------------------------- */}
      {/* 1. RATE CONFIGURATION CARD (Polished Stepper & Visual Slider) */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.rateDisplayCard}>
        {/* Top Tag & Description */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.tagPill}>
            <Icon name="award" size={12} color={colors.primaryBlue} />
            <Text style={styles.tagPillText}>PUBLISHED PROFIT COMMISSION RATE</Text>
          </View>
        </View>

        <Text style={styles.rateCardTitle}>Set Your Profit Commission</Text>
        <Text style={styles.rateCardSubtitle}>
          When an investor requests you to apply for an IPO on their behalf, you earn this percentage of realized listing profit upon allotment.
        </Text>

        {/* Stepper Control */}
        <View style={styles.stepperContainer}>
          {/* Step Down Button */}
          <TouchableOpacity
            style={[styles.stepBtn, rate <= 0 && styles.stepBtnDisabled]}
            onPress={handleStepDown}
            disabled={rate <= 0}
            activeOpacity={0.75}
          >
            <Text style={styles.stepBtnText}>– 2.5%</Text>
          </TouchableOpacity>

          {/* Central Rate Value & Badge */}
          <View style={styles.rateValueCol}>
            <Text style={styles.rateLargeValue}>{rate.toFixed(1)}%</Text>
            <View style={[styles.tierBadge, { backgroundColor: tierInfo.bg }]}>
              <Text style={[styles.tierBadgeText, { color: tierInfo.color }]}>
                {tierInfo.label}
              </Text>
            </View>
          </View>

          {/* Step Up Button */}
          <TouchableOpacity
            style={[styles.stepBtn, styles.stepBtnUp, rate >= 50 && styles.stepBtnDisabled]}
            onPress={handleStepUp}
            disabled={rate >= 50}
            activeOpacity={0.75}
          >
            <Text style={[styles.stepBtnText, styles.stepBtnUpText]}>+ 2.5%</Text>
          </TouchableOpacity>
        </View>

        {/* Visual Progress Track */}
        <View style={styles.trackContainer}>
          <View style={styles.trackBackground}>
            <View style={[styles.trackFillBar, { width: `${progressRatio}%` }]} />
            <View
              style={[
                styles.trackThumb,
                { left: `${Math.max(2, Math.min(96, progressRatio))}%` }
              ]}
            />
          </View>

          <View style={styles.trackLabelsRow}>
            <Text style={styles.trackTickText}>0.0% Min</Text>
            <Text style={styles.trackTickText}>25.0% Mid</Text>
            <Text style={styles.trackTickText}>50.0% Max</Text>
          </View>
        </View>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* 2. COMMISSION BASIS CARD (Clean & Trustworthy)                */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.basisCard}>
        <View style={styles.basisIconBox}>
          <Icon name="check-circle" size={18} color={colors.success} />
        </View>
        <View style={styles.basisTextCol}>
          <Text style={styles.basisTitle}>Commission Basis: Realized Listing Gain</Text>
          <Text style={styles.basisSubtitle}>
            Commission applies strictly upon allotment and realized listing profit. If the IPO experiences listing discount or no shares are allotted, ₹0 is charged.
          </Text>
        </View>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* 3. REASON FOR RATE REVISION (Optional Audit Trail Note)       */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.revisionCard}>
        <Text style={styles.revisionTitle}>Reason for Rate Revision</Text>
        <Text style={styles.revisionSubtitle}>
          Optional compliance note recorded in your auditable rate change history
        </Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Adjusted profit sharing margin for mainboard IPO season"
          placeholderTextColor="#94A3B8"
          style={styles.revisionInput}
        />
      </View>

      {/* ------------------------------------------------------------- */}
      {/* 4. LIVE PROFIT COMMISSION SIMULATION (Spacious Calculator)   */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.simulationCard}>
        <View style={styles.simHeaderRow}>
          <View style={styles.simIconBox}>
            <Icon name="trending-up" size={17} color={colors.primaryBlue} />
          </View>
          <View style={styles.simHeaderInfo}>
            <Text style={styles.simTitle}>Live Profit Commission Simulation</Text>
            <Text style={styles.simSubtitle}>
              Simulate your earnings across potential listing profits at {rate.toFixed(1)}%:
            </Text>
          </View>
        </View>

        {/* Quick Profit Presets */}
        <View style={styles.presetChipsRow}>
          {['5000', '10000', '25000', '50000'].map((preset) => {
            const isActive = sampleProfit === preset;
            return (
              <TouchableOpacity
                key={preset}
                style={[styles.presetChip, isActive && styles.presetChipActive]}
                onPress={() => setSampleProfit(preset)}
                activeOpacity={0.8}
              >
                <Text style={[styles.presetChipText, isActive && styles.presetChipTextActive]}>
                  ₹{parseInt(preset, 10).toLocaleString('en-IN')} Profit
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom Input Field */}
        <View style={styles.calcInputContainer}>
          <Text style={styles.calcCurrencySymbol}>₹</Text>
          <TextInput
            keyboardType="numeric"
            value={sampleProfit}
            onChangeText={setSampleProfit}
            placeholder="10000"
            placeholderTextColor="#94A3B8"
            style={styles.calcInputField}
          />
          <View style={styles.calcInputBadge}>
            <Text style={styles.calcInputBadgeText}>Sample Profit</Text>
          </View>
        </View>

        {/* Results Breakdown Box */}
        <View style={styles.resultsBreakdownCard}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Realized Listing Profit</Text>
            <Text style={styles.resultValue}>₹{numProfit.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>
              Your Commission ({rate.toFixed(1)}% on Profit)
            </Text>
            <Text style={styles.resultCommissionHighlight}>
              + ₹{calculatedCommission.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={[styles.resultRow, styles.resultDividerRow]}>
            <Text style={styles.resultTotalLabel}>Investor Net Profit Retained</Text>
            <Text style={styles.resultTotalValue}>
              ₹{investorNetProfit.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Compliance Note Callout */}
        <View style={styles.statutoryCallout}>
          <Text style={styles.statutoryCalloutText}>
            💡 <Text style={{ fontWeight: '700' }}>SEBI-Compliant Rule:</Text> Commission is earned exclusively on net realized listing profit upon allotment. Upfront advisory or consultation fees are strictly prohibited.
          </Text>
        </View>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* 5. ACTION BUTTONS (Save & Reset)                              */}
      {/* ------------------------------------------------------------- */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={styles.resetButton}
          activeOpacity={0.8}
          onPress={handleResetToDefault}
        >
          <Text style={styles.resetButtonText}>Reset to 5.0%</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveButton}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Publishing Rate...' : 'Save Rate Changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16
  },

  // 1. Rate Display Card Styles
  rateDisplayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9F0FA',
    padding: 18,
    ...shadows.sm
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF4FE',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#246BFD',
    letterSpacing: 0.5
  },
  rateCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#142B4D',
    marginBottom: 4
  },
  rateCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 16
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFD',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E9F0FA',
    marginBottom: 16
  },
  stepBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7F7',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm
  },
  stepBtnUp: {
    backgroundColor: '#246BFD',
    borderColor: '#246BFD'
  },
  stepBtnDisabled: {
    opacity: 0.35
  },
  stepBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#142B4D'
  },
  stepBtnUpText: {
    color: '#FFFFFF'
  },
  rateValueCol: {
    alignItems: 'center',
    flex: 1
  },
  rateLargeValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#142B4D',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4
  },
  tierBadgeText: {
    fontSize: 10.5,
    fontWeight: '600'
  },
  trackContainer: {
    marginTop: 4
  },
  trackBackground: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E9F0FA',
    position: 'relative',
    justifyContent: 'center'
  },
  trackFillBar: {
    height: '100%',
    backgroundColor: '#246BFD',
    borderRadius: 4
  },
  trackThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#246BFD',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    transform: [{ translateX: -8 }],
    ...shadows.sm
  },
  trackLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  trackTickText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500'
  },

  // 2. Commission Basis Card Styles
  basisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9F0FA',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm
  },
  basisIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  basisTextCol: {
    flex: 1
  },
  basisTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#142B4D'
  },
  basisSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2
  },

  // 3. Reason for Rate Revision Styles
  revisionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9F0FA',
    padding: 16,
    ...shadows.sm
  },
  revisionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#142B4D'
  },
  revisionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    marginBottom: 10
  },
  revisionInput: {
    height: 44,
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#142B4D'
  },

  // 4. Simulation Card Styles
  simulationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9F0FA',
    padding: 18,
    ...shadows.sm
  },
  simHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },
  simIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF4FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  simHeaderInfo: {
    flex: 1
  },
  simTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#142B4D'
  },
  simSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1
  },
  presetChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  presetChip: {
    flex: 1,
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  presetChipActive: {
    backgroundColor: '#246BFD',
    borderColor: '#246BFD'
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#142B4D'
  },
  presetChipTextActive: {
    color: '#FFFFFF'
  },
  calcInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12
  },
  calcCurrencySymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#142B4D',
    marginRight: 6
  },
  calcInputField: {
    flex: 1,
    height: 38,
    fontSize: 15,
    fontWeight: '700',
    color: '#142B4D'
  },
  calcInputBadge: {
    backgroundColor: '#EEF4FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  calcInputBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#246BFD'
  },
  resultsBreakdownCard: {
    backgroundColor: '#F8FAFD',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    padding: 14,
    marginBottom: 12
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  resultLabel: {
    fontSize: 12,
    color: '#64748B'
  },
  resultValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#142B4D',
    fontVariant: ['tabular-nums']
  },
  resultCommissionHighlight: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#10B981',
    fontVariant: ['tabular-nums']
  },
  resultDividerRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 0
  },
  resultTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#142B4D'
  },
  resultTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#246BFD',
    fontVariant: ['tabular-nums']
  },
  statutoryCallout: {
    backgroundColor: '#EEF4FE',
    borderRadius: 12,
    padding: 10
  },
  statutoryCalloutText: {
    fontSize: 10.5,
    color: '#142B4D',
    lineHeight: 15
  },

  // 5. Action Buttons Styles
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7F7',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#142B4D'
  },
  saveButton: {
    flex: 1.8,
    backgroundColor: '#246BFD',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});
