// Utilitário partilhado para download de ficheiros processados
import { save } from '@tauri-apps/plugin-dialog';
import { copyFile } from '@tauri-apps/plugin-fs';

/**
 * Abre diálogo "guardar como" e copia o ficheiro para o destino escolhido.
 * Devolve o caminho de destino, ou null se o utilizador cancelou.
 */
export async function downloadFile(
  sourcePath: string,
  defaultName: string,
): Promise<string | null> {
  const destPath = await save({ defaultPath: defaultName });
  if (!destPath) return null;
  await copyFile(sourcePath, destPath);
  return destPath;
}
