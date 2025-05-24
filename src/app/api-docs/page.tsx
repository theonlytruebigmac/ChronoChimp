'use client';

import { useEffect, useRef } from 'react';
import SwaggerUIBundle from 'swagger-ui-dist/swagger-ui-bundle';
import 'swagger-ui-dist/swagger-ui.css';

export default function ApiDocsPage() {
  const swaggerUI = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (swaggerUI.current) {
      SwaggerUIBundle({
        url: '/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
      });
    }
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div id="swagger-ui" ref={swaggerUI} />
    </div>
  );
}