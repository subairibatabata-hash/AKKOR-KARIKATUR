import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Modality } from "@google/genai";

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});

const App = () => {
    const [image, setImage] = useState<{ file: File | null, preview: string, base64: string }>({ file: null, preview: '', base64: '' });
    const [imageType, setImageType] = useState('Karikatur');
    const [imageStyle, setImageStyle] = useState('3D Kartun');
    const [instructions, setInstructions] = useState('');
    const [generatedImage, setGeneratedImage] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const styleOptions = [
        "Cat Air", "Impresionis", "Digital Art", "Lukisan Minyak", "Sketsa Pensil",
        "3D Kartun", "Anime", "Stiker Lucu", "Komik US", "Klasik"
    ];

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const preview = URL.createObjectURL(file);
            const base64 = await fileToBase64(file);
            setImage({ file, preview, base64 });
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!image.file || !imageStyle) {
            setStatusMessage("Silakan unggah foto dan pilih gaya terlebih dahulu sebelum membuat karikatur 😊.");
            setIsError(true);
            return;
        }

        setLoading(true);
        setGeneratedImage('');
        setStatusMessage('');
        setIsError(false);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let prompt = `Ubah foto berikut menjadi ${imageType} dengan gaya ${imageStyle}.`;
            if (instructions) {
                prompt += ` Tambahkan detail: ${instructions}.`;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        {
                            inlineData: {
                                data: image.base64,
                                mimeType: image.file.type,
                            },
                        },
                        { text: prompt },
                    ],
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

            if (imagePart?.inlineData) {
                const base64ImageBytes = imagePart.inlineData.data;
                const mimeType = imagePart.inlineData.mimeType;
                const imageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
                setGeneratedImage(imageUrl);
                setStatusMessage("✅ Gambar AKKOR KARIKATUR kamu sudah siap! Kamu bisa download atau ubah gaya lagi.");
                setIsError(false);
            } else {
                throw new Error("Gagal menghasilkan gambar. Coba lagi dengan prompt atau gambar yang berbeda.");
            }

        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
            setStatusMessage(`Error: ${errorMessage}`);
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };
    
    const handleDownload = () => {
        if(!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `akkor-karikatur-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleChangeStyle = () => {
        setGeneratedImage('');
        setStatusMessage('');
        setIsError(false);
    };

    return (
        <div className="app-container">
            <header>
                <h1>AKKOR KARIKATUR 🎨</h1>
                <p>Ubah fotomu jadi karya seni AI unik dan lucu!</p>
            </header>

            <main>
                {!generatedImage && (
                    <div className="card form-card">
                        <form onSubmit={handleSubmit} className="form-container">
                            <div className="form-group">
                                <label htmlFor="image-upload">1. Unggah Foto Wajah</label>
                                <input
                                    type="file"
                                    id="image-upload"
                                    accept=".jpg, .jpeg, .png"
                                    onChange={handleImageChange}
                                    style={{ display: 'none' }}
                                    aria-label="Unggah Foto Wajah"
                                />
                                <label htmlFor="image-upload" className="image-upload-area" role="button" tabIndex={0}>
                                    {image.preview ? (
                                        <img src={image.preview} alt="Pratinjau Foto" className="image-preview" />
                                    ) : (
                                        "Klik atau seret foto ke sini"
                                    )}
                                </label>
                            </div>

                            <div className="form-group">
                                <label htmlFor="image-type">2. Pilih Jenis</label>
                                <select id="image-type" value={imageType} onChange={(e) => setImageType(e.target.value)}>
                                    <option>Seni Lukis</option>
                                    <option>Karikatur</option>
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="image-style">3. Pilih Gaya</label>
                                <select id="image-style" value={imageStyle} onChange={(e) => setImageStyle(e.target.value)}>
                                    {styleOptions.map(style => <option key={style} value={style}>{style}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="instructions">4. Instruksi Tambahan (Opsional)</label>
                                <textarea
                                    id="instructions"
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder="Contoh: tambahkan latar belakang taman bunga, buat wajah lebih ceria…"
                                    rows={3}
                                />
                            </div>

                            <button type="submit" disabled={loading || !image.file}>
                                {loading ? 'Membuat...' : 'Buat Gambar 🎨'}
                            </button>
                        </form>
                    </div>
                )}
                
                {(loading || statusMessage) && (
                    <div className="card result-area">
                        {loading && <div className="loading-spinner" aria-label="Loading"></div>}
                        
                        {statusMessage && (
                            <p className={`status-message ${isError ? 'error-message' : 'success-message'}`}>
                                {statusMessage}
                            </p>
                        )}

                        {generatedImage && (
                            <>
                                <img src={generatedImage} alt="Hasil Karikatur AI" className="result-image" />
                                <div className="secondary-buttons">
                                    <button onClick={handleDownload}>Download Gambar</button>
                                    <button onClick={handleChangeStyle}>Ubah Gaya Lagi</button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode><App /></React.StrictMode>);
