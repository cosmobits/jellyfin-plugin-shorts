// Development-only UI fixture. Never connects to a real server.
import { mount } from '../src/embed';
mount(document.getElementById('root')!, {
  async libraries() { return [{id:'fixture',name:'Gesture test library'}]; },
  async videos() { return [{id:'a',name:'First test video',duration:8},{id:'b',name:'Second test video',duration:7200}]; },
  async stream() { return new Promise(() => {}); },
  openVideo() {}, exit() {}
});
