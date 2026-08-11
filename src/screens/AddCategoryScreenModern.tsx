import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import {
  haptic,
  ServiceActionSheet,
  ServiceButton,
  ServiceConfirmSheet,
  ServiceEmptyState,
  ServiceListRow,
  ServiceRowGroup,
  ServiceSectionHeader,
  ServiceSurface,
  ServiceSwipeRow,
  ServiceTextField,
  useAdaptiveLayout,
  useSnackbar,
} from '../design-system';
import { useLocalization } from '../i18n';
import { RootStackParamList } from '../navigation/routes';
import { useMenuStore } from '../stores';

type AddCategoryRoute = RouteProp<RootStackParamList, 'AddCategory'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function AddCategoryScreenModern() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<AddCategoryRoute>();
  const { tokens } = useTheme();
  const { t } = useLocalization();
  const layout = useAdaptiveLayout();
  const categories = useMenuStore((state) => state.categories);
  const addCategory = useMenuStore((state) => state.addCategory);
  const updateCategory = useMenuStore((state) => state.updateCategory);
  const deleteCategory = useMenuStore((state) => state.deleteCategory);
  const editingCategory = useMemo(
    () => categories.find((category) => category.id === route.params?.categoryId),
    [categories, route.params?.categoryId],
  );
  const isEditing = Boolean(editingCategory);
  const [name, setName] = useState(editingCategory?.name ?? '');
  const [actionTargetId, setActionTargetId] = useState<string>();
  const [pendingDeleteId, setPendingDeleteId] = useState<string>();
  const { show } = useSnackbar();
  const actionTarget = categories.find((category) => category.id === actionTargetId);
  const pendingDelete = categories.find((category) => category.id === pendingDeleteId);

  const save = () => {
    const nextName = name.trim();
    if (!nextName) {
      haptic('warning');
      show({ message: t.enterCategoryName, tone: 'warning' });
      return;
    }
    try {
      if (editingCategory) updateCategory(editingCategory.id, { name: nextName });
      else addCategory({ name: nextName });
      haptic('success');
      show({ message: isEditing ? t.categoryUpdated : t.categoryAdded, tone: 'success' });
      setName('');
      if (editingCategory) navigation.goBack();
    } catch {
      haptic('error');
      show({ message: t.genericError, tone: 'error' });
    }
  };

  const performDelete = (id: string) => {
    setPendingDeleteId(undefined);
    try {
      deleteCategory(id);
      haptic('success');
      show({ message: t.categoryDeleted, tone: 'success' });
    } catch {
      haptic('error');
      show({ message: t.genericError, tone: 'error' });
    }
  };

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          alignSelf: 'center',
          gap: tokens.space.lg,
          maxWidth: tokens.sizing.contentMaximumWidth,
          padding: layout.horizontalPadding,
          paddingBottom: tokens.space.xxxl,
          width: '100%',
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ServiceSurface padding="large" variant="raised">
          <ServiceTextField
            autoFocus={isEditing}
            label={`${t.categoryName} *`}
            onChangeText={setName}
            placeholder={t.enterCategoryName}
            returnKeyType="done"
            onSubmitEditing={save}
            value={name}
          />
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: tokens.space.xs,
              marginTop: tokens.space.md,
            }}
          >
            <ServiceButton
              label={t.cancel}
              onPress={() => navigation.goBack()}
              style={{ flexBasis: 140, flexGrow: 1 }}
              variant="ghost"
            />
            <ServiceButton
              disabled={!name.trim()}
              icon="checkmark-outline"
              label={isEditing ? t.update : t.add}
              onPress={save}
              style={{ flexBasis: 180, flexGrow: 1 }}
            />
          </View>
        </ServiceSurface>

        {!isEditing ? (
          <>
            <ServiceSectionHeader title={t.menuManagement} />
            {categories.length === 0 ? (
              <ServiceEmptyState
                body={t.addFirstCategory}
                icon="list-outline"
                title={t.noCategoriesYet}
              />
            ) : (
              <ServiceRowGroup>
                {/*
                  Her satırın altındaki kalıcı "Sil" düğmesi kaldırıldı. Silme artık
                  sola kaydırınca açılan eylemde ya da uzun basışla gelen listede:
                  ikisi de aynı onayı gösterir, ama listeyi tararken yanlışlıkla
                  basılabilecek bir yıkıcı hedef bırakmaz.
                */}
                {categories.map((category, index) => (
                  <ServiceSwipeRow
                    actions={[
                      {
                        destructive: true,
                        icon: 'trash-outline',
                        id: 'delete',
                        label: t.delete,
                        onPress: () => setPendingDeleteId(category.id),
                      },
                    ]}
                    key={category.id}
                    onLongPress={() => setActionTargetId(category.id)}
                  >
                    <ServiceListRow
                      accessory="chevron"
                      icon="list-outline"
                      last={index === categories.length - 1}
                      onPress={() =>
                        navigation.navigate('AddCategory', { categoryId: category.id })
                      }
                      title={category.name}
                    />
                  </ServiceSwipeRow>
                ))}
              </ServiceRowGroup>
            )}
          </>
        ) : null}
      </ScrollView>

      <ServiceActionSheet
        actions={
          actionTarget
            ? [
                {
                  icon: 'pencil-outline',
                  id: 'edit',
                  label: t.editCategory,
                  onPress: () =>
                    navigation.navigate('AddCategory', { categoryId: actionTarget.id }),
                },
                {
                  destructive: true,
                  icon: 'trash-outline',
                  id: 'delete',
                  label: t.deleteCategory,
                  onPress: () => setPendingDeleteId(actionTarget.id),
                },
              ]
            : []
        }
        cancelLabel={t.cancel}
        onClose={() => setActionTargetId(undefined)}
        title={actionTarget?.name ?? ''}
        visible={actionTarget !== undefined}
      />

      <ServiceConfirmSheet
        body={`${t.deleteCategoryConfirm}

${pendingDelete?.name ?? ''}`}
        cancelLabel={t.cancel}
        confirmLabel={t.deleteCategory}
        destructive
        onClose={() => setPendingDeleteId(undefined)}
        onConfirm={() => {
          if (pendingDelete) performDelete(pendingDelete.id);
        }}
        title={t.deleteCategory}
        visible={pendingDelete !== undefined}
      />
    </SafeAreaView>
  );
}
