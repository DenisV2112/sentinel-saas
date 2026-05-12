package com.sentinel.auth.exception.handler;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * D1: Verifies GlobalExceptionHandler uses SLF4J logging (log.error)
 * instead of ex.printStackTrace() for exception handling.
 *
 * RED phase: This test should FAIL because printStackTrace() currently
 * writes to System.err on every handled exception.
 */
class GlobalExceptionHandlerTest {

    private final ByteArrayOutputStream errContent = new ByteArrayOutputStream();
    private final PrintStream originalErr = System.err;
    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        System.setErr(new PrintStream(errContent));
    }

    @AfterEach
    void tearDown() {
        System.setErr(originalErr);
    }

    @Test
    void handleGenericExceptionShouldNotCallPrintStackTrace() {
        // D1: The spec requires log.error("msg", ex) — NOT printStackTrace()
        Exception testException = new RuntimeException("Test exception for D1");

        handler.handleGenericException(testException);

        // After fix: System.err should be EMPTY (printStackTrace not called)
        String stderrOutput = errContent.toString();
        assertTrue(stderrOutput.isEmpty(),
                "printStackTrace() was called but should NOT be. " +
                "Use log.error(\"msg\", ex) with SLF4J instead. " +
                "Output captured: " + stderrOutput);
    }

    @Test
    void handleRuntimeExceptionShouldNotCallPrintStackTrace() {
        RuntimeException testException = new RuntimeException("Runtime test");

        handler.handleRuntimeException(testException);

        String stderrOutput = errContent.toString();
        assertTrue(stderrOutput.isEmpty(),
                "printStackTrace() was called on RuntimeException handler. " +
                "Use log.error(\"msg\", ex) instead.");
    }
}
