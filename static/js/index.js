window.HELP_IMPROVE_VIDEOJS = false;

// More Works dropdown removed (UI deleted); keep CSS intact for potential reuse.

// TODO: fetch static/data/test_metrics.json and map evaluator outputs into resultsData.
const resultsData = {
    test: { accuracy: 0.00, macroF1: 0.00, top5: 0.00, ece: 0.00, latencyMs: 0.0, throughput: 0.0 },
    dataset: { name: "HF ASL Dataset", split: "test", isOOD: false },
    validationBest: { epoch: 0, accuracy: 0.00, macroF1: 0.00 },
    baselines: [
        { name: "Zero-shot CLIP", accuracy: 0.00, macroF1: 0.00 },
        { name: "Linear-probe CLIP", accuracy: 0.00, macroF1: 0.00 },
        { name: "Fine-tuned (Ours)", accuracy: 0.00, macroF1: 0.00 }
    ],
    confusion: {
        labels: ["A","B","C","D","E","F","G","H"],
        matrix: null,
        mostConfusedPairs: [["O","P"],["M","N"]]
    },
    calibration: {
        bins: [0.05,0.15,0.25,0.35,0.45,0.55,0.65,0.75,0.85,0.95],
        accuracy: null,
        confidence: null,
        ece: 0.00
    }
    // optional:
    // ood: { dataset: { name: "Kaggle ASL Alphabet", split: "test", isOOD: true }, test: {...} }
};

function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function animateNumber(el, from, to, duration, formatFn) {
    if (!el) return;
    if (prefersReducedMotion()) {
        el.textContent = formatFn(to);
        return;
    }

    const start = performance.now();

    function tick(now) {
        const elapsed = Math.min((now - start) / duration, 1);
        const eased = easeOutCubic(elapsed);
        const value = from + (to - from) * eased;
        el.textContent = formatFn(value);

        if (elapsed < 1) {
            requestAnimationFrame(tick);
        }
    }

    requestAnimationFrame(tick);
}

function animateOnceWhenVisible(sectionEl, callback) {
    if (!sectionEl || typeof callback !== 'function') return;
    if (prefersReducedMotion()) {
        callback();
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                callback();
                obs.disconnect();
            }
        });
    }, { threshold: 0.2 });

    observer.observe(sectionEl);
}

function formatPercent(value) {
    if (typeof value !== 'number') return '0.00';
    return (value * 100).toFixed(2) + '%';
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    }
}

function renderBaselineChart(baselines) {
    const container = document.getElementById('baseline-chart-rows');
    if (!container) return;
    container.innerHTML = '';

    baselines.forEach((baseline) => {
        const row = document.createElement('div');
        row.className = 'bar-row';

        const label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = baseline.name;

        const bars = document.createElement('div');
        bars.className = 'bar-values';

        const accBar = document.createElement('div');
        accBar.className = 'bar bar-acc';
        accBar.style.setProperty('--bar-width', (baseline.accuracy * 100).toFixed(1) + '%');
        accBar.style.width = prefersReducedMotion() ? accBar.style.getPropertyValue('--bar-width') : '0%';
        accBar.style.opacity = prefersReducedMotion() ? '1' : '0';
        accBar.textContent = formatPercent(baseline.accuracy);

        const f1Bar = document.createElement('div');
        f1Bar.className = 'bar bar-f1';
        f1Bar.style.setProperty('--bar-width', (baseline.macroF1 * 100).toFixed(1) + '%');
        f1Bar.style.width = prefersReducedMotion() ? f1Bar.style.getPropertyValue('--bar-width') : '0%';
        f1Bar.style.opacity = prefersReducedMotion() ? '1' : '0';
        f1Bar.textContent = formatPercent(baseline.macroF1);

        bars.appendChild(accBar);
        bars.appendChild(f1Bar);

        row.appendChild(label);
        row.appendChild(bars);
        container.appendChild(row);
    });
}

function generateRandomMatrix(size) {
    const matrix = [];
    for (let i = 0; i < size; i++) {
        const row = [];
        for (let j = 0; j < size; j++) {
            const base = i === j ? 60 + Math.random() * 20 : Math.random() * 8;
            row.push(Math.round(base));
        }
        matrix.push(row);
    }
    return matrix;
}

function generateCalibrationStub(bins) {
    const accuracy = bins.map((b) => Math.max(0, Math.min(1, b + (Math.random() - 0.5) * 0.08)));
    const confidence = bins.map((b) => Math.max(0, Math.min(1, b + (Math.random() - 0.5) * 0.04)));
    return { accuracy, confidence };
}

function setupCanvasSize(canvas, height = 320) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 600;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
}

function drawConfusionMatrix(canvas, labels, matrix, progress, highlight) {
    const ctx = setupCanvasSize(canvas, 360);
    if (!ctx) return;
    const width = canvas.clientWidth;
    const height = 360;
    const padding = 56;
    const gridSize = Math.min(width - padding * 2, height - padding * 2);
    const cellSize = gridSize / labels.length;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'transparent';

    const maxVal = Math.max(...matrix.flat(), 1);

    for (let i = 0; i < labels.length; i++) {
        for (let j = 0; j < labels.length; j++) {
            const value = matrix[i][j] * progress;
            const alpha = Math.min(value / maxVal, 1);
            ctx.fillStyle = `rgba(90, 164, 255, ${0.12 + alpha * 0.78})`;
            const x = padding + j * cellSize;
            const y = padding + i * cellSize;
            ctx.fillRect(x, y, cellSize - 2, cellSize - 2);
        }
    }

    if (highlight) {
        const hx = padding + highlight.col * cellSize;
        const hy = padding + highlight.row * cellSize;
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(hx, hy, cellSize - 2, cellSize - 2);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding - 1, padding - 1, gridSize + 2, gridSize + 2);

    ctx.fillStyle = 'rgba(226,232,240,0.9)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const step = labels.length > 24 ? 3 : (labels.length > 14 ? 2 : 1);
    labels.forEach((label, idx) => {
        if (idx % step !== 0) return;
        const x = padding + idx * cellSize + cellSize / 2;
        ctx.fillText(label, x, padding - 18);
        ctx.fillText(label, padding - 18, padding + idx * cellSize + cellSize / 2);
    });

    ctx.fillStyle = 'rgba(226,232,240,0.6)';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Predicted', padding + gridSize / 2, height - 16);
    ctx.save();
    ctx.translate(16, padding + gridSize / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('True', 0, 0);
    ctx.restore();
}

function drawCalibrationCurve(canvas, bins, accuracy, confidence, progress, highlightIndex) {
    const ctx = setupCanvasSize(canvas, 280);
    if (!ctx) return;
    const width = canvas.clientWidth;
    const height = 280;
    const padding = 32;
    const plotW = width - padding * 2;
    const plotH = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, plotW, plotH);

    ctx.strokeStyle = 'rgba(226,232,240,0.35)';
    ctx.beginPath();
    ctx.moveTo(padding, padding + plotH);
    ctx.lineTo(padding + plotW, padding);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(90, 164, 255, 0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    bins.forEach((bin, idx) => {
        const t = idx / (bins.length - 1);
        if (t > progress) return;
        const x = padding + bin * plotW;
        const y = padding + (1 - accuracy[idx]) * plotH;
        if (idx === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    if (typeof highlightIndex === 'number') {
        const x = padding + bins[highlightIndex] * plotW;
        const y = padding + (1 - accuracy[highlightIndex]) * plotH;
        ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = 'rgba(226,232,240,0.5)';
    ctx.fillText('Confidence', padding + plotW / 2, height - 6);
    ctx.save();
    ctx.translate(12, padding + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Accuracy', 0, 0);
    ctx.restore();

    ctx.fillStyle = 'rgba(226,232,240,0.8)';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('0.0', padding, padding + plotH + 14);
    ctx.fillText('1.0', padding + plotW - 12, padding + plotH + 14);
    ctx.fillText('1.0', padding - 18, padding + 4);
}

function attachConfusionHover(canvas, tooltip, data) {
    if (!canvas || !tooltip) return;
    const labels = data.confusion.labels;
    const matrix = data.confusion.matrix || generateRandomMatrix(labels.length);

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const padding = 56;
        const gridSize = Math.min(rect.width - padding * 2, 360 - padding * 2);
        const cellSize = gridSize / labels.length;
        const col = Math.floor((x - padding) / cellSize);
        const row = Math.floor((y - padding) / cellSize);

        if (col >= 0 && row >= 0 && col < labels.length && row < labels.length) {
            const value = matrix[row][col];
            tooltip.textContent = `${labels[row]} → ${labels[col]}: ${value}`;
            tooltip.style.transform = `translate(${x + 12}px, ${y - 8}px)`;
            tooltip.classList.add('is-visible');
            drawConfusionMatrix(canvas, labels, matrix, 1, { row, col });
        } else {
            tooltip.classList.remove('is-visible');
            drawConfusionMatrix(canvas, labels, matrix, 1);
        }
    });

    canvas.addEventListener('mouseleave', () => {
        tooltip.classList.remove('is-visible');
        drawConfusionMatrix(canvas, labels, matrix, 1);
    });
}

function attachCalibrationHover(canvas, tooltip, data) {
    if (!canvas || !tooltip) return;
    const bins = data.calibration.bins;
    const accuracy = data.calibration.accuracy || generateCalibrationStub(bins).accuracy;
    const confidence = data.calibration.confidence || generateCalibrationStub(bins).confidence;

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const padding = 32;
        const plotW = rect.width - padding * 2;
        const ratio = Math.max(0, Math.min(1, (x - padding) / plotW));
        const idx = Math.round(ratio * (bins.length - 1));

        if (idx >= 0 && idx < bins.length) {
            tooltip.textContent = `bin ${bins[idx].toFixed(2)} | acc ${accuracy[idx].toFixed(2)} | conf ${confidence[idx].toFixed(2)}`;
            tooltip.style.transform = `translate(${x + 12}px, 12px)`;
            tooltip.classList.add('is-visible');
            drawCalibrationCurve(canvas, bins, accuracy, confidence, 1, idx);
        } else {
            tooltip.classList.remove('is-visible');
            drawCalibrationCurve(canvas, bins, accuracy, confidence, 1);
        }
    });

    canvas.addEventListener('mouseleave', () => {
        tooltip.classList.remove('is-visible');
        drawCalibrationCurve(canvas, bins, accuracy, confidence, 1);
    });
}

function formatEce(value) {
    if (typeof value !== 'number') return '0.000';
    return value.toFixed(3);
}

function formatLatency(value) {
    if (typeof value !== 'number') return '0.0';
    return value.toFixed(1);
}

function formatThroughput(value) {
    if (typeof value !== 'number') return '0.0';
    return value.toFixed(1);
}

function renderResults(data) {
    if (!data) return;

    setText('metric-test-acc', formatPercent(data.test.accuracy));
    setText('metric-test-f1', formatPercent(data.test.macroF1));
    setText('metric-test-top5', formatPercent(data.test.top5));
    setText('metric-test-ece', formatEce(data.test.ece));

    if (data.test.latencyMs && data.test.latencyMs > 0) {
        setText('metric-throughput', formatLatency(data.test.latencyMs));
        setText('metric-throughput-label', 'Latency (ms/img)');
    } else {
        setText('metric-throughput', formatThroughput(data.test.throughput));
        setText('metric-throughput-label', 'Throughput (img/s)');
    }

    setText('metric-dataset', data.dataset.name);
    setText('dataset-badge', data.dataset.isOOD ? 'OOD Test' : 'In-dataset Test');

    renderBaselineChart(data.baselines || []);

    setText('val-acc', formatPercent(data.validationBest.accuracy));
    setText('val-f1', formatPercent(data.validationBest.macroF1));
    setText('val-epoch', data.validationBest.epoch.toString());
    setText('test-acc', formatPercent(data.test.accuracy));
    setText('test-f1', formatPercent(data.test.macroF1));

    const pairs = document.getElementById('confusion-pairs');
    if (pairs && data.confusion && data.confusion.mostConfusedPairs) {
        pairs.innerHTML = '';
        data.confusion.mostConfusedPairs.forEach((pair) => {
            const item = document.createElement('li');
            item.textContent = pair.join(' vs ');
            pairs.appendChild(item);
        });
    }
    setText('calibration-ece', formatEce(data.calibration.ece));

    const oodSection = document.getElementById('ood-results');
    if (oodSection && data.ood) {
        oodSection.style.display = 'block';
        setText('ood-acc', formatPercent(data.ood.test.accuracy));
        setText('ood-top5', formatPercent(data.ood.test.top5));
        setText('ood-f1', formatPercent(data.ood.test.macroF1));
        setText('ood-ece', formatEce(data.ood.test.ece));
    } else if (oodSection) {
        oodSection.style.display = 'none';
    }
}

function animateBars() {
    const bars = document.querySelectorAll('#baseline-chart .bar');
    bars.forEach((bar) => {
        bar.classList.remove('is-animated');
    });
    requestAnimationFrame(() => {
        bars.forEach((bar) => {
            bar.classList.add('is-animated');
            bar.style.opacity = '1';
        });
    });
}

function animateValidationDelta(data) {
    const valAcc = document.getElementById('val-acc');
    const testAcc = document.getElementById('test-acc');
    if (!valAcc || !testAcc) return;

    const delta = (data.test.accuracy - data.validationBest.accuracy) * 100;
    if (!testAcc.parentElement.querySelector('.delta-annotation')) {
        const deltaEl = document.createElement('span');
        deltaEl.className = 'delta-annotation';
        deltaEl.textContent = `Δ ${delta.toFixed(2)}%`;
        testAcc.parentElement.appendChild(deltaEl);

        if (prefersReducedMotion()) {
            deltaEl.classList.add('is-visible');
        } else {
            setTimeout(() => {
                deltaEl.classList.add('is-visible');
            }, 900);
        }
    }
}

function animateMetricCards(data) {
    animateNumber(document.getElementById('metric-test-acc'), 0, data.test.accuracy, 900, formatPercent);
    animateNumber(document.getElementById('metric-test-f1'), 0, data.test.macroF1, 900, formatPercent);
    animateNumber(document.getElementById('metric-test-top5'), 0, data.test.top5, 900, formatPercent);
    animateNumber(document.getElementById('metric-test-ece'), 0, data.test.ece, 900, formatEce);

    if (data.test.latencyMs && data.test.latencyMs > 0) {
        animateNumber(document.getElementById('metric-throughput'), 0, data.test.latencyMs, 900, formatLatency);
    } else {
        animateNumber(document.getElementById('metric-throughput'), 0, data.test.throughput, 900, formatThroughput);
    }

    if (data.ood) {
        animateNumber(document.getElementById('ood-acc'), 0, data.ood.test.accuracy, 900, formatPercent);
        animateNumber(document.getElementById('ood-top5'), 0, data.ood.test.top5, 900, formatPercent);
        animateNumber(document.getElementById('ood-f1'), 0, data.ood.test.macroF1, 900, formatPercent);
        animateNumber(document.getElementById('ood-ece'), 0, data.ood.test.ece, 900, formatEce);
    }
}

function animateCalibration(data) {
    animateNumber(document.getElementById('calibration-ece'), 0, data.calibration.ece, 900, formatEce);
}

function renderConfusionAndCalibration(data) {
    const matrix = data.confusion.matrix || generateRandomMatrix(data.confusion.labels.length);
    const bins = data.calibration.bins;
    const calibrationStub = generateCalibrationStub(bins);
    const accuracy = data.calibration.accuracy || calibrationStub.accuracy;
    const confidence = data.calibration.confidence || calibrationStub.confidence;

    const confusionCanvas = document.getElementById('confusion-canvas');
    const calibrationCanvas = document.getElementById('calibration-canvas');
    const confusionTooltip = document.getElementById('confusion-tooltip');
    const calibrationTooltip = document.getElementById('calibration-tooltip');
    const duration = prefersReducedMotion() ? 1 : 900;
    const start = performance.now();

    function tick(now) {
        const elapsed = Math.min((now - start) / duration, 1);
        const eased = prefersReducedMotion() ? 1 : easeOutCubic(elapsed);
        drawConfusionMatrix(confusionCanvas, data.confusion.labels, matrix, eased);
        drawCalibrationCurve(calibrationCanvas, bins, accuracy, confidence, eased);

        if (elapsed < 1) {
            requestAnimationFrame(tick);
        } else {
            if (!confusionCanvas.dataset.hoverBound) {
                attachConfusionHover(confusionCanvas, confusionTooltip, data);
                confusionCanvas.dataset.hoverBound = 'true';
            }
            if (!calibrationCanvas.dataset.hoverBound) {
                attachCalibrationHover(calibrationCanvas, calibrationTooltip, data);
                calibrationCanvas.dataset.hoverBound = 'true';
            }
        }
    }

    requestAnimationFrame(tick);
}

async function loadResultsFiles(data) {
    const updates = {};

    try {
        const response = await fetch('static/results/validation_epoch_9_confusion_matrix.json');
        if (response.ok) {
            const payload = await response.json();
            updates.confusion = {
                labels: payload.labels || data.confusion.labels,
                matrix: payload.matrix || data.confusion.matrix,
                mostConfusedPairs: data.confusion.mostConfusedPairs
            };
        }
    } catch (err) {
        console.warn('Confusion matrix JSON unavailable, using stub data.', err);
    }

    try {
        const response = await fetch('static/results/validation_epoch_9_ece.json');
        if (response.ok) {
            const payload = await response.json();
            updates.calibration = {
                bins: payload.bins || data.calibration.bins,
                accuracy: payload.accuracy || data.calibration.accuracy,
                confidence: payload.confidence || data.calibration.confidence,
                ece: typeof payload.ece === 'number' ? payload.ece : data.calibration.ece
            };
        }
    } catch (err) {
        console.warn('Calibration JSON unavailable, using stub data.', err);
    }

    return {
        ...data,
        ...updates,
        confusion: updates.confusion || data.confusion,
        calibration: updates.calibration || data.calibration
    };
}

function revealResultsSection(data) {
    const section = document.getElementById('results');
    if (!section) return;

    const revealTargets = section.querySelectorAll('.reveal-on-scroll');
    revealTargets.forEach((el) => el.classList.add('is-visible'));

    const table = section.querySelector('.results-table');
    if (table) {
        table.classList.add('is-highlighted');
    }

    animateMetricCards(data);
    animateBars();
    animateValidationDelta(data);
    animateCalibration(data);
}

// Copy BibTeX to clipboard
function copyBibTeX() {
    const bibtexElement = document.getElementById('bibtex-code');
    const button = document.querySelector('.copy-bibtex-btn');
    const copyText = button.querySelector('.copy-text');
    
    if (bibtexElement) {
        navigator.clipboard.writeText(bibtexElement.textContent).then(function() {
            // Success feedback
            button.classList.add('copied');
            copyText.textContent = 'Cop';
            
            setTimeout(function() {
                button.classList.remove('copied');
                copyText.textContent = 'Copy';
            }, 2000);
        }).catch(function(err) {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = bibtexElement.textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            button.classList.add('copied');
            copyText.textContent = 'Cop';
            setTimeout(function() {
                button.classList.remove('copied');
                copyText.textContent = 'Copy';
            }, 2000);
        });
    }
}

// Scroll to top functionality
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/hide scroll to top button
window.addEventListener('scroll', function() {
    const scrollButton = document.querySelector('.scroll-to-top');
    if (window.pageYOffset > 300) {
        scrollButton.classList.add('visible');
    } else {
        scrollButton.classList.remove('visible');
    }
});

// Video carousel autoplay when in view
function setupVideoCarouselAutoplay() {
    const carouselVideos = document.querySelectorAll('.results-carousel video');
    
    if (carouselVideos.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                // Video is in view, play it
                video.play().catch(e => {
                    // Autoplay failed, probably due to browser policy
                    console.log('Autoplay prevented:', e);
                });
            } else {
                // Video is out of view, pause it
                video.pause();
            }
        });
    }, {
        threshold: 0.5 // Trigger when 50% of the video is visible
    });
    
    carouselVideos.forEach(video => {
        observer.observe(video);
    });
}

$(document).ready(function() {
    // Check for click events on the navbar burger icon

    var options = {
		slidesToScroll: 1,
		slidesToShow: 1,
		loop: true,
		infinite: true,
		autoplay: true,
		autoplaySpeed: 5000,
    }

	// Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);
	
    bulmaSlider.attach();
    
    // Setup video autoplay for carousel
    setupVideoCarouselAutoplay();

    renderResults(resultsData);

    const resultsSection = document.getElementById('results');
    animateOnceWhenVisible(resultsSection, async () => {
        const merged = await loadResultsFiles(resultsData);
        renderResults(merged);
        revealResultsSection(merged);
        renderConfusionAndCalibration(merged);
    });
})
