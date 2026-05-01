/**
 * navStore — armazena dados de navegação em memória para evitar que objetos
 * complexos sejam serializados como "[object Object]" na URL (React Navigation web).
 *
 * Uso:
 *   navStorePut('editLancamento', item);
 *   navigation.navigate('EditLancamento', { lancamentoId: item.id });
 *
 *   // na tela destino:
 *   const item = navStoreGet<Lancamento>('editLancamento');
 */

const store = new Map<string, unknown>();

export function navStorePut(key: string, value: unknown): void {
  store.set(key, value);
}

export function navStoreGet<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function navStoreClear(key: string): void {
  store.delete(key);
}
