import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceSheet } from './ServiceSheet';

export interface ServiceAction {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly destructive?: boolean;
  readonly disabled?: boolean;
  readonly onPress: () => void;
}

export interface ServiceActionSheetProps {
  readonly visible: boolean;
  readonly title: string;
  readonly subtitle?: string;
  readonly actions: readonly ServiceAction[];
  readonly cancelLabel: string;
  readonly onClose: () => void;
}

/**
 * Uzun basış ve taşma düğmesinin ortak hedefi: bir öğeye ait bağlamsal eylemler.
 *
 * Kaydırma hareketiyle aynı eylemleri sunar, böylece hiçbir işlem yalnızca
 * gizli bir harekete bağlı kalmaz.
 */
export function ServiceActionSheet({
  visible,
  title,
  subtitle,
  actions,
  cancelLabel,
  onClose,
}: ServiceActionSheetProps) {
  const { tokens } = useTheme();

  return (
    <ServiceSheet onClose={onClose} subtitle={subtitle} title={title} visible={visible}>
      <ScrollView
        bounces={false}
        contentContainerStyle={{ paddingHorizontal: tokens.space.md }}
        // `overflow: auto` gives a flex item an automatic CSS min-height of 0,
        // so without flexShrink: 0 this collapses below its own content height
        // inside ServiceSheet's flex column — actions get clipped to under one
        // row even with plenty of screen space free. flexShrink: 0 forces it to
        // size to content; ServiceSheet's maxHeight: '90%' still caps it and
        // only then does this scroll, when a sheet genuinely has many actions.
        style={{ flexGrow: 0, flexShrink: 0 }}
      >
        {actions.map((action) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: action.disabled }}
            disabled={action.disabled}
            key={action.id}
            onPress={() => {
              // Önce kapat, sonra çalıştır: eylem yeni bir sayfa ya da onay açarsa
              // iki katman üst üste binmesin.
              onClose();
              action.onPress();
            }}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: pressed ? tokens.colors.surfaceAlt : 'transparent',
              borderRadius: tokens.radius.medium,
              flexDirection: 'row',
              minHeight: tokens.sizing.primaryTarget,
              opacity: action.disabled ? 0.45 : 1,
              paddingHorizontal: tokens.space.xs,
            })}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: action.destructive
                  ? tokens.colors.state.cancelled.bg
                  : tokens.colors.accentSoft,
                borderRadius: tokens.radius.medium,
                height: 36,
                justifyContent: 'center',
                marginRight: tokens.space.sm,
                width: 36,
              }}
            >
              <Ionicons
                color={action.destructive ? tokens.colors.error : tokens.colors.accent}
                name={action.icon}
                size={19}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  tokens.typography.label,
                  { color: action.destructive ? tokens.colors.error : tokens.colors.text },
                ]}
              >
                {action.label}
              </Text>
              {action.description ? (
                <Text
                  style={[
                    tokens.typography.caption,
                    { color: tokens.colors.textSubtle, marginTop: 2 },
                  ]}
                >
                  {action.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: tokens.space.md, paddingTop: tokens.space.xs }}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: pressed ? tokens.colors.border : tokens.colors.surfaceAlt,
            borderRadius: tokens.radius.medium,
            justifyContent: 'center',
            minHeight: tokens.sizing.minimumTarget,
          })}
        >
          <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
            {cancelLabel}
          </Text>
        </Pressable>
      </View>
    </ServiceSheet>
  );
}
