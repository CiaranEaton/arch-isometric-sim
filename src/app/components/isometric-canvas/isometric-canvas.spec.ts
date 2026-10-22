import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IsometricCanvas } from './isometric-canvas';

describe('IsometricCanvas', () => {
  let component: IsometricCanvas;
  let fixture: ComponentFixture<IsometricCanvas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IsometricCanvas],
    }).compileComponents();

    fixture = TestBed.createComponent(IsometricCanvas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
