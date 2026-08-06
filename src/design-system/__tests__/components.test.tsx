import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';
import { ThemeProvider } from '../../contexts/ThemeContext';
import {
  ServiceButton,
  ServiceEmptyState,
  ServiceIconButton,
  ServiceSegmented,
  ServiceSkeleton,
  ServiceStatusPill,
  ServiceStepper,
  ServiceSurface,
  ServiceTextField,
} from '../components';

jest.mock('react-native/Libraries/Components/ActivityIndicator/ActivityIndicator', () => ({
  __esModule: true,
  default: 'ActivityIndicator',
}));

async function renderWithTheme(element: React.ReactElement) {
  return render(<ThemeProvider>{element}</ThemeProvider>);
}

describe('service design-system interactions', () => {
  it('exposes a labelled, pressable primary action', async () => {
    const onPress = jest.fn();
    const screen = await renderWithTheme(
      <ServiceButton label="Add order" icon="add-outline" onPress={onPress} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Add order' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('blocks a loading action and exposes its busy state', async () => {
    const onPress = jest.fn();
    const screen = await renderWithTheme(<ServiceButton label="Save" loading onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Save' });

    expect(button.props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps icon-only actions understandable to assistive technology', async () => {
    const screen = await renderWithTheme(
      <ServiceIconButton icon="ellipsis-horizontal" label="More table actions" />,
    );

    expect(screen.getByRole('button', { name: 'More table actions' })).toBeTruthy();
  });

  it('renders a visible field label and announces validation errors', async () => {
    const screen = await renderWithTheme(
      <ServiceTextField label="Order note" value="" error="Order note is too long" />,
    );

    expect(screen.getByLabelText('Order note')).toBeTruthy();
    expect(screen.getByText('Order note is too long').props).toMatchObject({
      accessibilityLiveRegion: 'polite',
    });
  });

  it('offers a recovery action from an empty state', async () => {
    const onPress = jest.fn();
    const screen = await renderWithTheme(
      <ServiceEmptyState
        icon="restaurant-outline"
        title="No open tables"
        body="Open a table to start service."
        action={{ label: 'Open table', onPress }}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Open table' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('steps a quantity up and down within its bounds', async () => {
    const onChange = jest.fn();
    const screen = await renderWithTheme(
      <ServiceStepper
        value={1}
        onChange={onChange}
        label="Köfte adedi"
        minimum={1}
        maximum={3}
        decrementLabel="Azalt"
        incrementLabel="Arttır"
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Arttır' }));
    expect(onChange).toHaveBeenCalledWith(2);

    // Alt sınırdaki azaltma butonu devre dışı olmalı, aksi halde 0 adet yazılabilirdi.
    const decrement = screen.getByRole('button', { name: 'Azalt' });
    expect(decrement.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(decrement);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('reports the stepper value to assistive technology', async () => {
    const screen = await renderWithTheme(
      <ServiceStepper
        value={2}
        onChange={jest.fn()}
        label="Kişi sayısı"
        minimum={1}
        maximum={8}
        decrementLabel="Azalt"
        incrementLabel="Arttır"
      />,
    );

    expect(screen.getByLabelText('Kişi sayısı').props.accessibilityValue).toEqual({
      now: 2,
      min: 1,
      max: 8,
    });
  });

  it('marks the active segment as selected and reports its count', async () => {
    const onChange = jest.fn();
    const screen = await renderWithTheme(
      <ServiceSegmented
        label="Sipariş özeti"
        value="kitchen"
        onChange={onChange}
        options={[
          { value: 'all', label: 'Tümü' },
          { value: 'kitchen', label: 'Mutfağa', count: 4 },
          { value: 'drinks', label: 'İçecekler', count: 3 },
        ]}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Mutfağa, 4' }).props.accessibilityState).toMatchObject({
      selected: true,
    });

    fireEvent.press(screen.getByRole('tab', { name: 'İçecekler, 3' }));
    expect(onChange).toHaveBeenCalledWith('drinks');
  });
});

describe('service component visual-state contract', () => {
  it('keeps core rest, pressed, disabled, status, surface and loading states stable', async () => {
    const screen = await renderWithTheme(
      <View>
        <ServiceButton label="Rest" />
        <ServiceButton label="Pressed" testOnly_pressed />
        <ServiceButton label="Disabled" disabled />
        <ServiceButton label="Loading" loading />
        <ServiceStatusPill label="Pending" tone="warning" icon="time-outline" />
        <ServiceStatusPill label="Paid" tone="info" icon="card-outline" size="large" />
        <ServiceSurface variant="raised">
          <ServiceSkeleton height={24} label="Loading table" />
        </ServiceSurface>
      </View>,
    );

    expect(screen.toJSON()).toMatchSnapshot();
  });
});
