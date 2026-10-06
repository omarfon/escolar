import { Component } from '@angular/core';
import { EvaluacionNotasComponent } from './evaluacion-notas.component';

@Component({
  selector: 'app-rectificacion-notas',
  standalone: true,
  imports: [EvaluacionNotasComponent],
  template: `<app-evaluacion-notas [modoRectificacion]="true" />`,
})
export class RectificacionNotasComponent {}
