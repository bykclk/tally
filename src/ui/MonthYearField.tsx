import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { monthLabel } from '@/lib/date';
import { useLocale, useT } from '@/lib/i18n';
import { useTheme } from './theme';

type Props = {
  label?: string;
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  error?: string | null;
};

const MIN_DATE = new Date(2000, 0, 1);
const MAX_DATE = new Date(2100, 11, 31);

export function MonthYearField({
  label,
  year,
  month,
  onChange,
  error,
}: Props) {
  const theme = useTheme();
  const locale = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);

  const currentDate = new Date(year, month - 1, 1);

  const handleValueChange = (_event: unknown, selectedDate: Date) => {
    onChange(selectedDate.getFullYear(), selectedDate.getMonth() + 1);
    if (Platform.OS === 'android') {
      setOpen(false);
    }
  };

  const handleDismiss = () => setOpen(false);

  const borderColor = error ? theme.colors.danger : theme.colors.border;

  return (
    <View style={{ gap: theme.spacing(1) }}>
      {label && (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.xs,
            fontWeight: theme.font.weight.medium,
          }}
        >
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: theme.colors.surface,
            borderColor,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing(3),
            paddingVertical: theme.spacing(3),
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.md,
            textTransform: 'capitalize',
          }}
        >
          {monthLabel(year, month, locale)}
        </Text>
      </Pressable>
      {error && (
        <Text
          style={{
            color: theme.colors.danger,
            fontSize: theme.font.size.xs,
          }}
        >
          {error}
        </Text>
      )}

      {open && Platform.OS === 'android' && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          minimumDate={MIN_DATE}
          maximumDate={MAX_DATE}
          onValueChange={handleValueChange}
          onDismiss={handleDismiss}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={open}
          animationType="slide"
          transparent
          onRequestClose={() => setOpen(false)}
        >
          <View style={modalStyles.container}>
            <Pressable
              style={modalStyles.backdrop}
              onPress={() => setOpen(false)}
            />
            <View
              style={[
                modalStyles.sheet,
                {
                  backgroundColor: theme.colors.surface,
                  borderTopLeftRadius: theme.radius.lg,
                  borderTopRightRadius: theme.radius.lg,
                },
              ]}
            >
              <View
                style={[
                  modalStyles.header,
                  { borderBottomColor: theme.colors.border },
                ]}
              >
                <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                  <Text
                    style={{
                      color: theme.colors.accent,
                      fontSize: theme.font.size.md,
                      fontWeight: theme.font.weight.semibold,
                    }}
                  >
                    {t('common.done')}
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={currentDate}
                mode="date"
                display="spinner"
                minimumDate={MIN_DATE}
                maximumDate={MAX_DATE}
                onValueChange={handleValueChange}
                themeVariant={theme.mode}
                locale={locale}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
