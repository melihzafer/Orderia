import React, { useId, useState } from 'react';
import {
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface ServiceTextFieldProps extends Omit<TextInputProps, 'style'> {
  readonly label: string;
  readonly error?: string;
  readonly helperText?: string;
  readonly containerStyle?: StyleProp<ViewStyle>;
  readonly inputStyle?: StyleProp<TextStyle>;
  /** Alanı dışarıdan odaklamak için; örneğin ana ekrandaki "isimle ara" kısayolu. */
  readonly inputRef?: React.Ref<TextInput>;
  /** Etiketi görsel olarak gizler ama ekran okuyucuya bırakır. */
  readonly hideLabel?: boolean;
}

export function ServiceTextField({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  inputRef,
  hideLabel = false,
  onFocus,
  onBlur,
  editable = true,
  ...props
}: ServiceTextFieldProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const generatedId = useId().replace(/:/g, '');
  const inputId = props.nativeID ?? `field-${generatedId}`;
  const supportText = error ?? helperText;

  return (
    <View style={containerStyle}>
      {hideLabel ? null : (
        <Text
          nativeID={`${inputId}-label`}
          style={[
            tokens.typography.label,
            {
              color: tokens.colors.text,
              marginBottom: tokens.space.xs,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <TextInput
        {...props}
        accessibilityLabel={label}
        ref={inputRef}
        accessibilityState={{ disabled: !editable }}
        editable={editable}
        nativeID={inputId}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        placeholderTextColor={tokens.colors.textMuted}
        style={[
          tokens.typography.body,
          {
            backgroundColor: editable ? tokens.colors.surface : tokens.colors.surfaceAlt,
            borderColor: error
              ? tokens.colors.error
              : focused
                ? tokens.colors.focus
                : tokens.colors.border,
            borderRadius: tokens.radius.medium,
            borderWidth: focused || error ? 2 : 1,
            color: tokens.colors.text,
            minHeight: tokens.sizing.minimumTarget,
            paddingHorizontal: tokens.space.md,
            paddingVertical: tokens.space.sm,
          },
          inputStyle,
        ]}
      />
      {supportText ? (
        <Text
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          style={[
            tokens.typography.caption,
            {
              color: error ? tokens.colors.error : tokens.colors.textSubtle,
              marginTop: tokens.space.xs,
            },
          ]}
        >
          {supportText}
        </Text>
      ) : null}
    </View>
  );
}
