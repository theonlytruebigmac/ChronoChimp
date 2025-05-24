declare module 'swagger-ui-dist/swagger-ui-bundle' {
  interface SwaggerUIConfig {
    url?: string;
    dom_id?: string;
    deepLinking?: boolean;
    presets?: any[];
  }

  interface SwaggerUIBundle {
    (config: SwaggerUIConfig): void;
    presets: {
      apis: any[];
    };
    SwaggerUIStandalonePreset: any;
  }

  const SwaggerUIBundle: SwaggerUIBundle;
  export default SwaggerUIBundle;
}
