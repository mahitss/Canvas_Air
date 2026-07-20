import { describe, it, expect } from "vitest";
import { ShaderManager } from "../src/shaders/manager";
import { GPUResourceManager } from "../src/gpu/manager";
import { ShaderCompilationError } from "../src/errors";

describe("Shader Framework & Validation", () => {
  it("should register a valid shader template and retrieve it with default version", () => {
    const manager = new ShaderManager();
    const vs = "void main() { gl_Position = vec4(0.0); }";
    const fs = "precision mediump float; void main() { gl_FragColor = vec4(1.0); }";

    manager.registerShader("CustomShader", vs, fs);
    const source = manager.getShaderSource("CustomShader");

    expect(source.version).toBe(1);
    expect(source.vertex).toBe(vs);
    expect(source.fragment).toBe(fs);
  });

  it("should throw a ShaderCompilationError when validating invalid shaders", () => {
    const manager = new ShaderManager();

    // 1. Missing main function
    const vs1 = "void main() {}";
    const fs1 = "precision mediump float; void helper() {}";
    expect(() => manager.registerShader("Invalid1", vs1, fs1)).toThrow(ShaderCompilationError);

    // 2. Mismatched braces
    const vs2 = "void main() {";
    const fs2 = "precision mediump float; void main() {}";
    expect(() => manager.registerShader("Invalid2", vs2, fs2)).toThrow(ShaderCompilationError);

    // 3. Missing precision declaration
    const vs3 = "void main() {}";
    const fs3 = "void main() {}";
    expect(() => manager.registerShader("Invalid3", vs3, fs3)).toThrow(ShaderCompilationError);
  });

  it("should support hot reload, increment versions, and invalidate GPU caches", () => {
    const manager = new ShaderManager();
    const gpu = new GPUResourceManager();

    const vs1 = "void main() { gl_Position = vec4(1.0); }";
    const fs1 = "precision mediump float; void main() { gl_FragColor = vec4(1.0); }";

    manager.registerShader("HotShader", vs1, fs1);
    const program1 = manager.getCompiledProgram("HotShader", gpu);

    // Update with new code block
    const vs2 = "void main() { gl_Position = vec4(2.0); }";
    const fs2 = "precision mediump float; void main() { gl_FragColor = vec4(2.0); }";

    manager.updateShader("HotShader", vs2, fs2, gpu);

    const source = manager.getShaderSource("HotShader");
    expect(source.version).toBe(2);

    // The next getCompiledProgram call must miss cache and generate a new program
    const program2 = manager.getCompiledProgram("HotShader", gpu);
    expect(program1).not.toBe(program2);
  });
});
