# Given the amplitudes and phases, produces the function value at
# an x-position.
foorier <- function(x, amplitudes, phases, TT, N) {
  fx <- amplitudes[1] / N
  for (n in 1:(N / 2)) {
    frequency <- 2 * pi * n / TT
    fx <- fx + (amplitudes[n] / (N / 2)) * cos(frequency * x + phases[n])
  }
  return(fx)
}

# Takes the array of length N output from fft.js - completeSpectrum and
# returnes two N / 2 length arrays with the amplitudes and phase shifts
get_amp_phase <- function(out) {
  N <- length(out)
  amplitudes <- rep(0, N / 2)
  phases <- rep(0, N / 2)

  for (i in seq(1, N - 1, by = 2)) {
    real <- out[i]
    imag <- out[i + 1]
    amplitude <- sqrt(real * real + imag * imag)
    phase <- atan2(imag, real)

    amplitudes[(i + 1) / 2] <- amplitude
    phases[(i + 1) / 2] <- phase
  }
  return(list(
    amplitudes = amplitudes,
    phases = phases
  ))
}
