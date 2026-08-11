jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// React'e burasının bir test ortamı olduğunu söyler. Bayrak olmadan React 19,
// efekt içindeki setState çağrılarını "act(...) ile sarılmamış" diye uyarıyor ve
// daha kötüsü, ekran testlerinde efektler `waitFor` turları arasında
// boşaltılmadığı için testler yüklenme durumunda takılı kalıyor.
global.IS_REACT_ACT_ENVIRONMENT = true;
