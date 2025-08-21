// src/main/java/com/example/demo/util/ArtifactIdGenerator.java
package com.example.demo.util;

import java.security.SecureRandom;
import java.util.Arrays;

public final class ArtifactIdGenerator {
  // Crockford Base32 (no I, L, O, U) — ULID alphabet
  private static final char[] ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ".toCharArray();
  private static final SecureRandom RNG = new SecureRandom();

  private static long lastTime = -1L;        // for monotonicity
  private static final char[] lastRand = new char[16];

  private ArtifactIdGenerator() {}

  public static synchronized String newArtifactId() {
    long now = System.currentTimeMillis();

    // 10 chars of time (48-bit; we encode base32 with leading zeros)
    char[] timeChars = new char[10];
    long t = now;
    for (int i = 9; i >= 0; i--) {
      timeChars[i] = ALPHABET[(int) (t & 31)];
      t >>>= 5;
    }

    // 16 chars of randomness (80-bit)
    char[] randChars = new char[16];
    if (now == lastTime) {
      // same ms: increment last random to keep it strictly increasing
      System.arraycopy(lastRand, 0, randChars, 0, 16);
      for (int i = 15; i >= 0; i--) {
        int idx = indexOf(randChars[i]);
        idx = (idx + 1) & 31;                // wrap at 32
        randChars[i] = ALPHABET[idx];
        if (idx != 0) break;                 // stop carry once no wrap
      }
    } else {
      byte[] bytes = new byte[10];           // 80 bits
      RNG.nextBytes(bytes);
      // pack 80 bits -> 16 base32 chars
      int bitBuf = 0, bits = 0, out = 0;
      for (byte b : bytes) {
        bitBuf = (bitBuf << 8) | (b & 0xFF);
        bits += 8;
        while (bits >= 5) {
          int idx = (bitBuf >>> (bits - 5)) & 31;
          bits -= 5;
          randChars[out++] = ALPHABET[idx];
        }
      }
      if (bits > 0) randChars[out++] = ALPHABET[(bitBuf << (5 - bits)) & 31];
      while (out < 16) randChars[out++] = ALPHABET[0];
    }

    lastTime = now;
    System.arraycopy(randChars, 0, lastRand, 0, 16);

    // keep your "a_" prefix for readability
    return "a_" + new String(timeChars) + new String(randChars);
  }

  private static int indexOf(char c) {
    for (int i = 0; i < ALPHABET.length; i++) if (ALPHABET[i] == c) return i;
    return 0;
  }
}
