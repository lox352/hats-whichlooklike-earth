declare module "*.tif" {
  const src: string;
  export default src;
}

declare module "*.rle" {
  const src: string;
  export default src;
}

declare module "*?raw" {
  const content: string;
  export default content;
}
