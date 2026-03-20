import { Component, Input, ElementRef, AfterViewInit, OnChanges, SimpleChanges, inject } from '@angular/core';

@Component({
  selector: 'app-ad-script',
  standalone: true,
  template: '',
})
export class AdScriptComponent implements AfterViewInit, OnChanges {
  @Input() script: string = '';
  private el = inject(ElementRef);

  ngAfterViewInit() {
    this.injectScript();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['script'] && !changes['script'].firstChange) {
      this.injectScript();
    }
  }

  private injectScript() {
    if (!this.script) return;

    // Clear previous content
    this.el.nativeElement.innerHTML = '';

    // Create a temporary container to parse the HTML
    const div = document.createElement('div');
    div.innerHTML = this.script;

    // Append all non-script elements
    const fragments = document.createDocumentFragment();
    const children = Array.from(div.childNodes);
    
    children.forEach(node => {
      if (node.nodeName === 'SCRIPT') {
        const script = document.createElement('script');
        const scriptNode = node as HTMLScriptElement;
        
        // Copy all attributes
        Array.from(scriptNode.attributes).forEach(attr => {
          script.setAttribute(attr.name, attr.value);
        });
        
        // Copy inner content
        script.textContent = scriptNode.textContent;
        
        // Append script
        this.el.nativeElement.appendChild(script);
      } else {
        this.el.nativeElement.appendChild(node.cloneNode(true));
      }
    });
  }
}
