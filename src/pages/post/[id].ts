import { JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  input,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { map } from 'rxjs';
import type { RoutingMeta } from '../../../plugin/routes';

const resolvePost = {
  post: (route: ActivatedRouteSnapshot) => {
    console.log(route.params['id'])

    return route;
  },
};

const routerMeta: RoutingMeta = {
  resolve: {
    ...resolvePost,
  },
}

const fb = new FormBuilder();


@Component({
  selector: 'app-post',
  standalone: true,
  imports: [JsonPipe, ReactiveFormsModule],
  template: `
    <h1>Post</h1>
    {{ post() }}

    <form [formGroup]="form" (submit)="submit()">
      <input type="text" formControlName="strField" />
      <input type="number" formControlName="numbField" />
      <button type="submit">submit</button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class PostComponent {
  private api = inject(HttpClient);

  post = input();

  title = 'treaty';
  form = fb.group({
    strField: fb.control('', Validators.required),
    numbField: fb.control<number | null>(null),
  });

    submit() {
        console.log('submit', this.form.value);
    }
}

export { PostComponent, routerMeta }

export default PostComponent;