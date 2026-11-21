import { tienePermiso } from './permisos';

describe('tienePermiso', () => {
  it('quien gestiona también consulta', () => {
    expect(tienePermiso(['PRIOSTE'], 'tunicas', 'G')).toBe(true);
    expect(tienePermiso(['PRIOSTE'], 'tunicas', 'C')).toBe(true);
  });

  it('quien consulta no gestiona', () => {
    expect(tienePermiso(['CAPILLER'], 'hermanos', 'C')).toBe(true);
    expect(tienePermiso(['CAPILLER'], 'hermanos', 'G')).toBe(false);
    expect(tienePermiso(['ADMIN'], 'auditoria', 'G')).toBe(false);
  });

  it('sin acceso no se consulta ni se gestiona', () => {
    expect(tienePermiso(['CAPILLER'], 'importarHermanos', 'C')).toBe(false);
    expect(tienePermiso(['SECRETARIO'], 'usuarios', 'C')).toBe(false);
  });

  it('con varios roles vale el mayor acceso', () => {
    expect(tienePermiso(['CAPILLER', 'SECRETARIO'], 'hermanos', 'G')).toBe(true);
    expect(tienePermiso(['MAYORDOMO', 'CAPILLER'], 'entregas', 'G')).toBe(true);
  });

  it('sin roles o con un rol desconocido no hay acceso', () => {
    expect(tienePermiso([], 'hermanos')).toBe(false);
    expect(tienePermiso(['OTRO'], 'hermanos')).toBe(false);
  });
});
