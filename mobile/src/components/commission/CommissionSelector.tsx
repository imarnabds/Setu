import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ViewStyle
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { PrimaryButton } from '../common/PrimaryButton';
import { SecondaryButton } from '../common/SecondaryButton';
import { Icon } from '../common/Icon';

// The 21 discrete values in 2.5% increments from 0% to 50%
export const COMMISSION_STEPS = [
  0.0, 2.5, 5.0, 7.5, 10.0, 12.5, 15.0, 17.5, 20.0, 22.5, 25.0,
  27.5, 30.0, 32.5, 35.0, 37.5, 40.0, 42.5, 45.0, 47.5, 50.0
];

const QUICK_CHIPS = [0.0, 2.5, 5.0, 7.5, 10.0, 15.0, 20.0, 25.0, 35.0, 50.0];

interface CommissionSelectorProps {
  initialRate?: number;
  initialBasis?: string;
  onSave: (rate: number, basis: string, reason?: string) => Promise<void>;
  onReset?: () => void;
  style?: ViewStyle;
}

export const CommissionSelector: React.FC<CommissionSelectorProps> = ({
  initialRate = 5.0,
  initialBasis = 'Documented Advisory & Technical Assistance Base Fee',
  onSave,
  onReset,
  style
}) => {
  const [rate, setRate] = useState<number>(initialRate);
  const [basis, setBasis] = useState<string>(initialBasis);
  const [reason, setReason] = useState<string>('');
  const [sampleBase, setSampleBase] = useState<string>('2000');
  const [saving, setSaving] = useState(false);

  // Stepping helpers
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

  const handleChipSelect = (selectedRate: number) => {
    setRate(selectedRate);
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
    setBasis('Documented Advisory & Technical Assistance Base Fee');
    setReason('');
    if (onReset) onReset();
  };

  // Live calculation demonstration
  const numBase = parseFloat(sampleBase) || 0;
  const calculatedFee = Math.round((numBase * (rate / 100)) * 100) / 100;
  const totalPayable = Math.round((numBase + calculatedFee) * 100) / 100;

  // Rate label explanation
  const getRateStatusLabel = () => {
    if (rate === 0) return '0% — No commission';
    if (rate === 50) return '50% — Maximum configured rate';
    if (rate <= 5) return 'Competitive standard rate';
    if (rate <= 15) return 'Comprehensive assistance rate';
    return 'Specialized HNI / complex allocation advisory';
  };

  return (
    <View style={[styles.container, style]}>
      {/* Rate Display Header */}
      <View style={styles.displayCard}>
        <Text style={styles.displaySubtitle}>Published Commission Rate</Text>
        <View style={styles.rateRow}>
          <TouchableOpacity
            style={[styles.stepBtn, rate <= 0 && styles.stepBtnDisabled]}
            onPress={handleStepDown}
            disabled={rate <= 0}
          >
            <Text style={styles.stepBtnText}>- 2.5%</Text>
          </TouchableOpacity>

          <View style={styles.mainRateContainer}>
            <Text style={styles.mainRateText}>{rate.toFixed(1)}%</Text>
            <Text style={styles.mainRateBadge}>{getRateStatusLabel()}</Text>
          </View>

          <TouchableOpacity
            style={[styles.stepBtn, rate >= 50 && styles.stepBtnDisabled]}
            onPress={handleStepUp}
            disabled={rate >= 50}
          >
            <Text style={styles.stepBtnText}>+ 2.5%</Text>
          </TouchableOpacity>
        </View>

        {/* Visual Progress Bar representation */}
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${(rate / 50) * 100}%` }]} />
        </View>
        <View style={styles.trackLabels}>
          <Text style={styles.trackLabelText}>0% (Min)</Text>
          <Text style={styles.trackLabelText}>25%</Text>
          <Text style={styles.trackLabelText}>50% (Max)</Text>
        </View>
      </View>

      {/* Quick Select Chips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Select Rates (2.5% Increments)</Text>
        <View style={styles.chipsContainer}>
          {QUICK_CHIPS.map((chipRate) => {
            const isSelected = rate === chipRate;
            return (
              <TouchableOpacity
                key={chipRate}
                activeOpacity={0.7}
                onPress={() => handleChipSelect(chipRate)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {chipRate.toFixed(1)}%
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Calculation Basis Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Calculation Basis Definition</Text>
        <Text style={styles.helperText}>
          Specify the clearly defined monetary base. Commissions must be based on lawful advisory or service fees, never on application capital or profit-sharing.
        </Text>
        <TextInput
          value={basis}
          onChangeText={setBasis}
          placeholder="e.g. Documented Advisory & Technical Assistance Base Fee"
          placeholderTextColor={colors.secondaryText}
          style={styles.textInput}
        />
      </View>

      {/* Optional Change Reason */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reason for Rate Revision (Optional Audit Note)</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Updated terms for upcoming IPO season"
          placeholderTextColor={colors.secondaryText}
          style={styles.textInput}
        />
      </View>

      {/* Live Calculator Widget */}
      <View style={styles.calcWidget}>
        <View style={styles.calcHeader}>
          <Icon name="percent" size={16} color={colors.primaryActionBlue} />
          <Text style={styles.calcTitle}>Transparent Fee Simulation</Text>
        </View>
        <Text style={styles.calcDesc}>
          Test how this {rate.toFixed(1)}% commission applies to a sample service fee:
        </Text>

        <View style={styles.calcInputRow}>
          <Text style={styles.calcCurrency}>₹</Text>
          <TextInput
            keyboardType="numeric"
            value={sampleBase}
            onChangeText={setSampleBase}
            placeholder="2000"
            style={styles.calcBaseInput}
          />
          <Text style={styles.calcBaseLabel}>Sample Service Base</Text>
        </View>

        <View style={styles.calcResultBox}>
          <View style={styles.calcResultRow}>
            <Text style={styles.calcResultLabel}>Base Advisory Fee:</Text>
            <Text style={styles.calcResultValue}>₹{numBase.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.calcResultRow}>
            <Text style={styles.calcResultLabel}>Agreed Commission ({rate.toFixed(1)}%):</Text>
            <Text style={styles.calcResultHighlight}>+ ₹{calculatedFee.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.calcResultRow, styles.calcTotalRow]}>
            <Text style={styles.calcTotalLabel}>Total Arrangement Fee:</Text>
            <Text style={styles.calcTotalValue}>₹{totalPayable.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <Text style={styles.statutoryDisclaimer}>
          ⚖️ SEBI Compliance Notice: IPO CONNECT does not handle or route investment funds. Applications are submitted directly via ASBA or broker portals. Advisory fees are governed solely by mutual consent.
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <SecondaryButton
          label="Reset to Default"
          onPress={handleResetToDefault}
          style={styles.resetBtn}
        />
        <PrimaryButton
          label="Save Rate Changes"
          onPress={handleSave}
          loading={saving}
          style={styles.saveBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm
  },
  displayCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg
  },
  displaySubtitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: spacing.md
  },
  mainRateContainer: {
    alignItems: 'center'
  },
  mainRateText: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    fontVariant: ['tabular-nums']
  },
  mainRateBadge: {
    fontSize: typography.sizes.xs,
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.semibold,
    marginTop: 2
  },
  stepBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    ...shadows.sm
  },
  stepBtnDisabled: {
    opacity: 0.4
  },
  stepBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.sm
  },
  trackFill: {
    height: '100%',
    backgroundColor: colors.primaryActionBlue,
    borderRadius: 4
  },
  trackLabels: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs
  },
  trackLabelText: {
    fontSize: 10,
    color: colors.secondaryText,
    fontWeight: typography.weights.medium
  },
  section: {
    marginBottom: spacing.lg
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginBottom: spacing.xs
  },
  helperText: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    lineHeight: 16,
    marginBottom: spacing.sm
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  chip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  chipSelected: {
    borderColor: colors.primaryActionBlue,
    backgroundColor: colors.subtleBlueBackground
  },
  chipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primaryNavy
  },
  chipTextSelected: {
    color: colors.primaryActionBlue,
    fontWeight: typography.weights.bold
  },
  textInput: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.primaryText,
    backgroundColor: colors.surface
  },
  calcWidget: {
    backgroundColor: colors.subtleBlueBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  calcTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginLeft: 6
  },
  calcDesc: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText,
    marginVertical: 4
  },
  calcInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    marginVertical: spacing.sm
  },
  calcCurrency: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  calcBaseInput: {
    flex: 1,
    height: 38,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy,
    marginLeft: 4
  },
  calcBaseLabel: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText
  },
  calcResultBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  calcResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  calcResultLabel: {
    fontSize: typography.sizes.xs,
    color: colors.secondaryText
  },
  calcResultValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primaryNavy
  },
  calcResultHighlight: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryActionBlue
  },
  calcTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    marginTop: 4,
    marginBottom: 0
  },
  calcTotalLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryNavy
  },
  calcTotalValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.success
  },
  statutoryDisclaimer: {
    fontSize: 10,
    color: colors.secondaryText,
    marginTop: spacing.sm,
    lineHeight: 14
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md
  },
  resetBtn: {
    flex: 1
  },
  saveBtn: {
    flex: 2
  }
});
