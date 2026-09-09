import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-group-demo',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './group-demo.html',
  styleUrl: './group-demo.css',
})
export class GroupDemo {}
