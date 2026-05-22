import '@testing-library/jest-dom';

// jsdom não implementa window.confirm — definir um stub global que devolve true
// Os testes que precisam de controlar o resultado usam vi.spyOn(window, 'confirm')
window.confirm = () => true;
