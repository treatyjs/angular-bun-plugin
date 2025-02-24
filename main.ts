import { AppComponent } from './src/app.ng';
import {
    type ApplicationConfig,
    provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withRouterConfig, withDebugTracing } from '@angular/router';

import {
    provideClientHydration,
    bootstrapApplication,
    withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './src/routes.ng';

export const appConfig: ApplicationConfig = {
    providers: [
        provideExperimentalZonelessChangeDetection(),
        provideHttpClient(withFetch()),
        provideRouter(routes, withComponentInputBinding(), withDebugTracing(),
            withRouterConfig({ paramsInheritanceStrategy: 'always' })),
        // provideClientHydration(
        //     withHttpTransferCacheOptions({
        //         includePostRequests: true,
        //     })
        // ),
    ],
};

bootstrapApplication(AppComponent, appConfig).catch((err) =>
    console.error(err)
);