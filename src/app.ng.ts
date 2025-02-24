import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Second } from './test.ng';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Second],
  template: 'JORDAN <app-test /> <router-outlet />',
})
export class AppComponent {}