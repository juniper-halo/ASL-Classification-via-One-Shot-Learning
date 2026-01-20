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
        accBar.textContent = formatPercent(baseline.accuracy);

        const f1Bar = document.createElement('div');
        f1Bar.className = 'bar bar-f1';
        f1Bar.style.setProperty('--bar-width', (baseline.macroF1 * 100).toFixed(1) + '%');
        f1Bar.textContent = formatPercent(baseline.macroF1);

        bars.appendChild(accBar);
        bars.appendChild(f1Bar);

        row.appendChild(label);
        row.appendChild(bars);
        container.appendChild(row);
    });
}

function setImageWithFallback(imageId, placeholderId, imagePath) {
    const img = document.getElementById(imageId);
    const placeholder = document.getElementById(placeholderId);
    if (!img || !placeholder) return;

    placeholder.style.display = 'none';
    img.src = imagePath;

    img.onerror = function() {
        img.style.display = 'none';
        placeholder.style.display = 'flex';
    };

    img.onload = function() {
        img.style.display = 'block';
        placeholder.style.display = 'none';
    };
}

function renderResults(data) {
    if (!data) return;

    setText('metric-test-acc', formatPercent(data.test.accuracy));
    setText('metric-test-f1', formatPercent(data.test.macroF1));
    setText('metric-test-top5', formatPercent(data.test.top5));
    setText('metric-test-ece', data.test.ece.toFixed(3));

    if (data.test.latencyMs && data.test.latencyMs > 0) {
        setText('metric-throughput', data.test.latencyMs.toFixed(1));
        setText('metric-throughput-label', 'Latency (ms/img)');
    } else {
        setText('metric-throughput', data.test.throughput.toFixed(1));
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

    setImageWithFallback('confusion-image', 'confusion-placeholder', data.confusion.imagePath);
    setImageWithFallback('calibration-image', 'calibration-placeholder', data.calibration.imagePath);
    setText('calibration-ece', data.calibration.ece.toFixed(3));

    const oodSection = document.getElementById('ood-results');
    if (oodSection && data.ood) {
        oodSection.style.display = 'block';
        setText('ood-acc', formatPercent(data.ood.test.accuracy));
        setText('ood-top5', formatPercent(data.ood.test.top5));
        setText('ood-f1', formatPercent(data.ood.test.macroF1));
        setText('ood-ece', data.ood.test.ece.toFixed(3));
    } else if (oodSection) {
        oodSection.style.display = 'none';
    }
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
})
