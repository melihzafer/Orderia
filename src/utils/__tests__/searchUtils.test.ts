import { createTextMatcher, searchMenuItems } from '../searchUtils';

describe('createTextMatcher', () => {
  it('matches accents and casing without requiring exact input', () => {
    const matches = createTextMatcher('İÇECEK');

    expect(matches('Icecek')).toBe(true);
  });

  it('requires every query word to be present', () => {
    const matches = createTextMatcher('patates peynirli');

    expect(matches('Peynirli Patates Kızartması')).toBe(true);
    expect(matches('Patates Kızartması')).toBe(false);
  });

  it('matches every value for a blank query', () => {
    const matches = createTextMatcher('   ');

    expect(matches(undefined)).toBe(true);
  });
});

describe('searchMenuItems', () => {
  const items = [
    {
      categoryId: 'snacks',
      description: 'Çıtır patates',
      name: 'Patates Kızartması',
    },
    {
      categoryId: 'drinks',
      description: 'Soğuk içecek',
      name: 'Kola',
    },
  ];

  it('combines category and text filters', () => {
    expect(searchMenuItems(items, 'patates', 'snacks')).toEqual([items[0]]);
    expect(searchMenuItems(items, 'patates', 'drinks')).toEqual([]);
  });
});
