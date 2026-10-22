import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArchitectureWizard } from './architecture-wizard';

describe('ArchitectureWizard', () => {
  let component: ArchitectureWizard;
  let fixture: ComponentFixture<ArchitectureWizard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArchitectureWizard],
    }).compileComponents();

    fixture = TestBed.createComponent(ArchitectureWizard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
