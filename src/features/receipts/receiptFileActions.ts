import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function presentReceiptPdf(
  signedUrl: string,
  receiptNumber: string,
  mode: 'download' | 'share',
): Promise<string | undefined> {
  const fileName = `${sanitizeFileName(receiptNumber)}.pdf`;
  if (Platform.OS === 'web') {
    if (
      mode === 'share' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      await navigator.share({ title: receiptNumber, url: signedUrl });
      return;
    }
    if (typeof document === 'undefined') throw new Error('Browser download is unavailable');
    const anchor = document.createElement('a');
    anchor.href = signedUrl;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    anchor.target = '_blank';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }

  const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!directory) throw new Error('Device file storage is unavailable');
  const fileUri = `${directory}${fileName}`;
  const result = await FileSystem.downloadAsync(signedUrl, fileUri);
  if (mode === 'share') {
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is unavailable');
    await Sharing.shareAsync(result.uri, {
      dialogTitle: receiptNumber,
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
    });
  }
  return result.uri;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-');
}
