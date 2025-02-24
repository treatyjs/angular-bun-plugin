import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  template: `
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
  <h1 class="text-4xl font-bold text-gray-800">
    This App is Running Purely with Bun Bundle!
  </h1>
  <p class="mt-4 text-lg text-gray-600">
    Welcome to our Angular landing page styled with Tailwind CSS.
  </p>
</div>
  `,
})
export class AppComponent {}