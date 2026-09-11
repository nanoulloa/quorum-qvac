// Las librerías de Holepunch no publican tipos. Se declaran como `any` y se usan detrás de Almacen y Red.
declare module 'corestore' {
  const Corestore: any;
  export default Corestore;
}

declare module 'hyperswarm' {
  const Hyperswarm: any;
  export default Hyperswarm;
}

declare module 'protomux' {
  const Protomux: any;
  export default Protomux;
}

declare module 'compact-encoding' {
  const c: any;
  export default c;
}

declare module 'hypercore-crypto' {
  const crypto: any;
  export default crypto;
}
