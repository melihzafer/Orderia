import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetBackdrop, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useTheme } from '../../../contexts/ThemeContext';
import { ServiceButton, ServiceEmptyState, ServiceTextField } from '../../../design-system';
import { CancellationReason, Check, ModifierOptionId, OrderItem } from '../../../domain';
import type { WorkspaceProduct } from '../workspaceModel';
import { QuantityStepper } from '../../../components/QuantityStepper';
import type { WorkspaceCopy } from '../workspaceCopy';
import { Chip } from './WorkspaceChrome';

/**
 * Çalışma alanının modal ailesi: hesap adı, ürün/masa notu, ürün seçenekleri,
 * iptal akışı ve bunların ortak kabuğu.
 *
 * Hepsi `visible` + geri çağrı alan denetimli bileşenler.
 */

export function NameCheckModal({
  visible,
  name,
  copy,
  title,
  confirmLabel,
  onChange,
  onClose,
  onConfirm,
}: {
  readonly visible: boolean;
  readonly name: string;
  readonly copy: WorkspaceCopy;
  /** Var sayılan "Yeni hesap" başlığını değiştirir — örn. yeniden adlandırma için. */
  readonly title?: string;
  /** Var sayılan "Oluştur" etiketini değiştirir — örn. "Kaydet". */
  readonly confirmLabel?: string;
  readonly onChange: (value: string) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <WorkspaceModal title={title ?? copy.newCheck} visible={visible} onClose={onClose}>
      <ServiceTextField
        autoFocus
        label={copy.checkName}
        maxLength={80}
        onChangeText={onChange}
        placeholder={copy.checkExample}
        value={name}
      />
      <ModalActions
        cancel={copy.close}
        confirm={confirmLabel ?? copy.create}
        confirmDisabled={!name.trim()}
        onCancel={onClose}
        onConfirm={onConfirm}
      />
    </WorkspaceModal>
  );
}

export function ItemNoteModal({
  item,
  note,
  copy,
  onChange,
  onClose,
  onConfirm,
}: {
  readonly item?: OrderItem;
  readonly note: string;
  readonly copy: WorkspaceCopy;
  readonly onChange: (value: string) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <WorkspaceModal
      title={`${copy.editNote}: ${item?.nameSnapshot ?? ''}`}
      visible={Boolean(item)}
      onClose={onClose}
    >
      <ServiceTextField
        autoFocus
        label={copy.note}
        maxLength={500}
        multiline
        onChangeText={onChange}
        placeholder={copy.noteExample}
        value={note}
      />
      <NotePresetChips copy={copy} note={note} onChange={onChange} />
      <ModalActions
        cancel={copy.close}
        confirm={copy.saveNote}
        onCancel={onClose}
        onConfirm={onConfirm}
      />
    </WorkspaceModal>
  );
}

export function LocationNoteModal({
  visible,
  note,
  copy,
  onChange,
  onClose,
  onConfirm,
}: {
  readonly visible: boolean;
  readonly note: string;
  readonly copy: WorkspaceCopy;
  readonly onChange: (value: string) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <WorkspaceModal title={copy.locationNote} visible={visible} onClose={onClose}>
      <ServiceTextField
        autoFocus
        label={copy.locationNote}
        maxLength={500}
        multiline
        onChangeText={onChange}
        placeholder={copy.locationNoteExample}
        value={note}
      />
      <ModalActions
        cancel={copy.close}
        confirm={copy.saveLocationNote}
        onCancel={onClose}
        onConfirm={onConfirm}
      />
    </WorkspaceModal>
  );
}

export function NotePresetChips({
  copy,
  note,
  onChange,
}: {
  readonly copy: WorkspaceCopy;
  readonly note: string;
  readonly onChange: (note: string) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ marginTop: tokens.space.xs }}>
      <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
        {copy.quickNotes}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: tokens.space.xs,
          marginTop: tokens.space.xs,
        }}
      >
        {copy.notePresets.map((preset) => (
          <Chip
            key={preset}
            label={preset}
            selected={false}
            onPress={() => {
              const trimmed = note.trim();
              if (!trimmed) {
                onChange(preset);
                return;
              }
              if (trimmed.toLocaleLowerCase().includes(preset.toLocaleLowerCase())) return;
              onChange(`${trimmed}, ${preset}`);
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function ProductConfigurationModal({
  product,
  selected,
  note,
  copy,
  onToggle,
  onChangeNote,
  onClose,
  onConfirm,
}: {
  readonly product?: WorkspaceProduct;
  readonly selected: readonly ModifierOptionId[];
  readonly note: string;
  readonly copy: WorkspaceCopy;
  readonly onToggle: (groupId: string, optionId: ModifierOptionId) => void;
  readonly onChangeNote: (note: string) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  const { tokens } = useTheme();
  const valid =
    product?.modifierGroups.every((group) => {
      const count = selected.filter((id) =>
        group.options.some((option) => option.id === id),
      ).length;
      return (
        count >= Math.max(group.minimumChoices, group.isRequired ? 1 : 0) &&
        count <= (group.selectionType === 'single' ? 1 : (group.maximumChoices ?? 999))
      );
    }) ?? false;

  return (
    <WorkspaceModal title={product?.name ?? ''} visible={Boolean(product)} onClose={onClose}>
      <ScrollView style={{ maxHeight: 420 }}>
        {product?.modifierGroups.map((group) => (
          <View key={group.id} style={{ marginBottom: tokens.space.md }}>
            <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
              {group.name} {group.isRequired ? `· ${copy.required}` : ''}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: tokens.space.xs,
                marginTop: tokens.space.xs,
              }}
            >
              {group.options.map((option) => (
                <Chip
                  key={option.id}
                  label={`${option.name}${option.priceDeltaMinor ? ` +${option.priceDeltaMinor / 100}` : ''}`}
                  selected={selected.includes(option.id)}
                  onPress={() => onToggle(group.id, option.id)}
                />
              ))}
            </View>
          </View>
        ))}
        <ServiceTextField
          label={copy.note}
          maxLength={500}
          multiline
          onChangeText={onChangeNote}
          placeholder={copy.noteExample}
          value={note}
        />
        <NotePresetChips copy={copy} note={note} onChange={onChangeNote} />
      </ScrollView>
      <ModalActions
        cancel={copy.close}
        confirm={copy.addToDraft}
        confirmDisabled={!valid}
        onCancel={onClose}
        onConfirm={onConfirm}
      />
    </WorkspaceModal>
  );
}

export function CancellationModal({
  item,
  reasons,
  isManager,
  copy,
  onClose,
  onCancel,
}: {
  readonly item?: OrderItem;
  readonly reasons: readonly CancellationReason[];
  readonly isManager: boolean;
  readonly copy: WorkspaceCopy;
  readonly onClose: () => void;
  readonly onCancel: (reason: CancellationReason, quantity: number) => void;
}) {
  const { tokens } = useTheme();
  const maximum = item?.quantity ?? 1;
  const [quantity, setQuantity] = useState(maximum);

  // Satir degistiginde adet, o satirin tamamina doner: yarim kalmis bir
  // secim yanlislikla baska bir urune tasinmasin.
  useEffect(() => {
    setQuantity(maximum);
  }, [item?.id, maximum]);

  return (
    <WorkspaceModal
      title={`${copy.cancelItem}: ${item?.nameSnapshot ?? ''}`}
      visible={Boolean(item)}
      onClose={onClose}
    >
      <Text
        style={[
          tokens.typography.body,
          { color: tokens.colors.textSubtle, marginBottom: tokens.space.sm },
        ]}
      >
        {copy.chooseReason}
      </Text>
      {maximum > 1 ? (
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: tokens.space.md,
            marginBottom: tokens.space.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
              {copy.voidQuantityTitle}
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
              {copy.voidQuantityLabel}: {quantity} / {maximum}
            </Text>
          </View>
          <QuantityStepper
            decreaseDisabled={quantity <= 1}
            decreaseLabel={copy.decrease}
            increaseDisabled={quantity >= maximum}
            increaseLabel={copy.increase}
            onDecrease={() => setQuantity((current) => Math.max(1, current - 1))}
            onIncrease={() => setQuantity((current) => Math.min(maximum, current + 1))}
            quantity={quantity}
          />
        </View>
      ) : null}
      {reasons.length === 0 ? (
        <ServiceEmptyState
          body={copy.askManagerReasons}
          icon="alert-circle-outline"
          title={copy.noReasons}
        />
      ) : (
        <View style={{ gap: tokens.space.xs }}>
          {reasons.map((reason) => (
            <ServiceButton
              key={reason.id}
              disabled={reason.requiresManager && !isManager}
              fullWidth
              icon={reason.requiresManager ? 'shield-checkmark-outline' : 'close-circle-outline'}
              label={`${reason.name}${reason.requiresManager ? ` · ${copy.manager}` : ''}`}
              onPress={() => onCancel(reason, quantity)}
              variant="outline"
            />
          ))}
        </View>
      )}
      <ModalActions cancel={copy.close} onCancel={onClose} />
    </WorkspaceModal>
  );
}

/**
 * Kısmi servis paneli: satırın kaç adedinin masaya götürüldüğü.
 *
 * `CancellationModal`'ın adet steppera deseninin aynısı. Değişiklik ANINDA
 * uygulanmaz, "Kaydet"e basılınca uygulanır — böylece "Kapat" bedava bir geri
 * alma olur ve festivalde yanlış dokunuş masaya yanlış durum yazmaz.
 * Not düzenleme buraya taşındı: satırdaki uzun basış artık bu paneli açıyor.
 */
export function ServeQuantityModal({
  item,
  servedQuantity,
  copy,
  onClose,
  onEditNote,
  onSubmit,
}: {
  readonly item?: OrderItem;
  /** Satırın mevcut servis adedi — `servedCount()` ile türetilmiş olarak gelir. */
  readonly servedQuantity: number;
  readonly copy: WorkspaceCopy;
  readonly onClose: () => void;
  readonly onEditNote: (item: OrderItem) => void;
  readonly onSubmit: (item: OrderItem, servedQuantity: number) => void;
}) {
  const { tokens } = useTheme();
  const maximum = item?.quantity ?? 1;
  const [served, setServed] = useState(servedQuantity);

  // Satir degistiginde sayac o satirin gercek degerine doner: yarim kalmis bir
  // secim yanlislikla baska bir urune tasinmasin.
  useEffect(() => {
    setServed(servedQuantity);
  }, [item?.id, servedQuantity]);

  return (
    <WorkspaceModal
      title={`${copy.serveStatus}: ${item?.nameSnapshot ?? ''}`}
      visible={Boolean(item)}
      onClose={onClose}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.space.md,
          marginBottom: tokens.space.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
            {copy.served}
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
            {copy.servedCountLabel(served, maximum)}
            {served < maximum ? ` · ${copy.outstanding} ${maximum - served}` : ''}
          </Text>
        </View>
        <QuantityStepper
          decreaseDisabled={served <= 0}
          decreaseLabel={copy.decreaseServed}
          increaseDisabled={served >= maximum}
          increaseLabel={copy.increaseServed}
          onDecrease={() => setServed((current) => Math.max(0, current - 1))}
          onIncrease={() => setServed((current) => Math.min(maximum, current + 1))}
          quantity={served}
        />
      </View>
      <View style={{ gap: tokens.space.xs }}>
        <ServiceButton
          disabled={served >= maximum}
          fullWidth
          icon="checkmark-done-outline"
          label={copy.markAllServed}
          onPress={() => setServed(maximum)}
          variant="outline"
        />
        <ServiceButton
          disabled={served <= 0}
          fullWidth
          icon="arrow-undo-outline"
          label={copy.clearServed}
          onPress={() => setServed(0)}
          variant="outline"
        />
        <ServiceButton
          fullWidth
          icon="create-outline"
          label={copy.editNote}
          onPress={() => {
            if (item) onEditNote(item);
          }}
          variant="outline"
        />
      </View>
      <ModalActions
        cancel={copy.close}
        confirm={copy.saveServed}
        confirmDisabled={served === servedQuantity}
        onCancel={onClose}
        onConfirm={() => {
          if (item) onSubmit(item, served);
        }}
      />
    </WorkspaceModal>
  );
}

/**
 * Hesabın tamamını iptal eden onay akışı. `CancellationModal`'ın aynısı ama
 * tek bir satır değil, tüm hesap için — bu yüzden adet steppera gerek yok,
 * ama denetim izi tutarlılığı için aynı gerekçe listesi zorunlu kalıyor.
 */
export function DeleteCheckModal({
  check,
  reasons,
  isManager,
  copy,
  onClose,
  onConfirm,
}: {
  readonly check?: Check;
  readonly reasons: readonly CancellationReason[];
  readonly isManager: boolean;
  readonly copy: WorkspaceCopy;
  readonly onClose: () => void;
  readonly onConfirm: (reason: CancellationReason) => void;
}) {
  const { tokens } = useTheme();
  return (
    <WorkspaceModal
      title={`${copy.deleteCheck}: ${check?.name ?? ''}`}
      visible={Boolean(check)}
      onClose={onClose}
    >
      <Text
        style={[
          tokens.typography.body,
          { color: tokens.colors.textSubtle, marginBottom: tokens.space.sm },
        ]}
      >
        {copy.deleteCheckConfirmBody}
      </Text>
      {reasons.length === 0 ? (
        <ServiceEmptyState
          body={copy.askManagerReasons}
          icon="alert-circle-outline"
          title={copy.noReasons}
        />
      ) : (
        <View style={{ gap: tokens.space.xs }}>
          {reasons.map((reason) => (
            <ServiceButton
              key={reason.id}
              disabled={reason.requiresManager && !isManager}
              fullWidth
              icon={reason.requiresManager ? 'shield-checkmark-outline' : 'close-circle-outline'}
              label={`${reason.name}${reason.requiresManager ? ` · ${copy.manager}` : ''}`}
              onPress={() => onConfirm(reason)}
              variant="outline"
            />
          ))}
        </View>
      )}
      <ModalActions cancel={copy.close} onCancel={onClose} />
    </WorkspaceModal>
  );
}

export function WorkspaceModal({
  visible,
  title,
  children,
  onClose,
}: {
  readonly visible: boolean;
  readonly title: string;
  readonly children: React.ReactNode;
  readonly onClose: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable
        onPress={onClose}
        style={{
          backgroundColor: tokens.colors.overlay,
          flex: 1,
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          accessibilityViewIsModal
          onPress={(event) => event.stopPropagation()}
          style={[
            tokens.elevation.overlay,
            {
              alignSelf: 'center',
              backgroundColor: tokens.colors.surface,
              borderTopLeftRadius: tokens.radius.large,
              borderTopRightRadius: tokens.radius.large,
              maxHeight: '88%',
              maxWidth: 560,
              padding: tokens.space.lg,
              width: '100%',
            },
          ]}
        >
          <Text
            style={[
              tokens.typography.sectionTitle,
              { color: tokens.colors.text, marginBottom: tokens.space.md },
            ]}
          >
            {title}
          </Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ModalActions({
  cancel,
  confirm,
  confirmDisabled,
  onCancel,
  onConfirm,
}: {
  readonly cancel: string;
  readonly confirm?: string;
  readonly confirmDisabled?: boolean;
  readonly onCancel: () => void;
  readonly onConfirm?: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: tokens.space.xs,
        justifyContent: 'flex-end',
        marginTop: tokens.space.lg,
      }}
    >
      <ServiceButton label={cancel} onPress={onCancel} variant="ghost" />
      {confirm && onConfirm ? (
        <ServiceButton disabled={confirmDisabled} label={confirm} onPress={onConfirm} />
      ) : null}
    </View>
  );
}

export function CenteredState({ children }: { readonly children: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <SafeAreaView
      style={{
        alignItems: 'center',
        backgroundColor: tokens.colors.bg,
        flex: 1,
        gap: tokens.space.sm,
        justifyContent: 'center',
        padding: tokens.space.lg,
      }}
    >
      {children}
    </SafeAreaView>
  );
}

export const backdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
);
