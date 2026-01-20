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
    confusion: { imagePath: "static/images/confusion_matrix.png", mostConfusedPairs: [["O","P"],["M","N"]] },
    calibration: { imagePath: "static/images/calibration_curve.png", ece: 0.00 }
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

function setImageWithFallback(imageId, placeholderId, imagePath, frameId) {
    const img = document.getElementById(imageId);
    const placeholder = document.getElementById(placeholderId);
    const frame = document.getElementById(frameId);
    if (!img || !placeholder) return;

    placeholder.style.display = 'none';
    img.src = imagePath;

    img.onerror = function() {
        img.style.display = 'none';
        placeholder.style.display = 'flex';
        placeholder.classList.add('is-visible');
        if (frame) frame.classList.add('is-visible');
    };

    img.onload = function() {
        img.style.display = 'block';
        placeholder.style.display = 'none';
        img.classList.add('is-visible');
        if (frame) frame.classList.add('is-visible');
    };
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

    setImageWithFallback('confusion-image', 'confusion-placeholder', data.confusion.imagePath, 'confusion-frame');
    setImageWithFallback('calibration-image', 'calibration-placeholder', data.calibration.imagePath, 'calibration-frame');
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

function revealResultsSection() {
    const section = document.getElementById('results');
    if (!section) return;

    const revealTargets = section.querySelectorAll('.reveal-on-scroll');
    revealTargets.forEach((el) => el.classList.add('is-visible'));

    const table = section.querySelector('.results-table');
    if (table) {
        table.classList.add('is-highlighted');
    }

    animateMetricCards(resultsData);
    animateBars();
    animateValidationDelta(resultsData);
    animateCalibration(resultsData);
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
    animateOnceWhenVisible(resultsSection, revealResultsSection);
})
