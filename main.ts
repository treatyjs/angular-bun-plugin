import '@angular/compiler'
import 'zone.js'
import { AppComponent } from './app/ap.ng';
import {
    type ApplicationConfig,
    provideExperimentalZonelessChangeDetection,
} from '@angular/core';
  import { provideRouter, withComponentInputBinding } from '@angular/router';
  
  import {
    provideClientHydration,
    bootstrapApplication,
    withHttpTransferCacheOptions,
  } from '@angular/platform-browser';
  import { provideHttpClient, withFetch } from '@angular/common/http';
  
  export const appConfig: ApplicationConfig = {
    providers: [
      provideExperimentalZonelessChangeDetection(),
      provideHttpClient(withFetch()),
    //   provideRouter(routes, withComponentInputBinding()),
      provideClientHydration(
        withHttpTransferCacheOptions({
          includePostRequests: true,
        })
      ),
    ],
  };
  
bootstrapApplication(AppComponent).catch((err) =>
  console.error(err)
);