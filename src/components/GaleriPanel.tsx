import React, { useState } from "react";
import { getGallery, saveGallery, getKelompok, GalleryItem, Kelompok } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Camera, MessageSquare, Tag, Heart, Plus, Search, FolderHeart, Calendar 
} from "lucide-react";
import { toast } from "sonner";

interface GaleriPanelProps {
  userRole: string;
}

export function GaleriPanel({ userRole }: GaleriPanelProps) {
  const [gallery, setGallery] = useState<GalleryItem[]>(getGallery());
  const [kelompokList] = useState<Kelompok[]>(getKelompok());
  
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Semua");
  
  // Detailed Image Viewer
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);
  const [commentText, setCommentText] = useState("");

  // Upload Photo Simulator State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [formKelompok, setFormKelompok] = useState(kelompokList[0]?.namaKelompok || "");
  const [formCategory, setFormCategory] = useState<any>("Belajar");
  const [formCaption, setFormCaption] = useState("");
  const [formUrl, setFormUrl] = useState("");

  const isReadOnly = userRole === "Viewer";

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormUrl(reader.result as string);
      toast.success("Foto berhasil dipilih dari perangkat!");
    };
    reader.readAsDataURL(file);
  };

  const handleOpenDetail = (item: GalleryItem) => {
    setActiveItem(item);
    setCommentText("");
    setDetailOpen(true);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activeItem) return;

    const newComment = {
      user: userRole,
      text: commentText,
      date: new Date().toISOString().split("T")[0]
    };

    const updated = gallery.map(item => {
      if (item.id === activeItem.id) {
        const nextItem = {
          ...item,
          comments: [...item.comments, newComment]
        };
        setActiveItem(nextItem);
        return nextItem;
      }
      return item;
    });

    setGallery(updated);
    saveGallery(updated);
    setCommentText("");
    toast.success("Komentar ditambahkan!");
  };

  const handleUploadPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    if (!formUrl) {
      toast.error("Silakan pilih foto dari perangkat Anda terlebih dahulu!");
      return;
    }

    const newItem: GalleryItem = {
      id: "gal-" + Date.now(),
      kelompok: formKelompok,
      kategori: formCategory,
      url: formUrl,
      caption: formCaption,
      tanggal: new Date().toISOString().split("T")[0],
      tags: [formCategory.toLowerCase()],
      comments: []
    };

    const updated = [newItem, ...gallery];
    setGallery(updated);
    saveGallery(updated);
    toast.success("Foto kegiatan berhasil diunggah ke Galeri!");
    setUploadOpen(false);
    setFormUrl("");
    setFormCaption("");
  };

  const filteredGallery = gallery.filter(item => {
    const matchesSearch = item.caption.toLowerCase().includes(search.toLowerCase()) || 
                          item.kelompok.toLowerCase().includes(search.toLowerCase());
    const matchesCat = catFilter === "Semua" || item.kategori === catFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Galeri Dokumentasi TPQ</h2>
          <p className="text-slate-500 text-sm">Dokumentasi foto/video kegiatan belajar mengajar, lomba, ujian, dan kerja bakti.</p>
        </div>

        {!isReadOnly && (
          <Button onClick={() => setUploadOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold gap-2 py-3 text-xs shadow-sm">
            <Camera className="h-4.5 w-4.5" /> Unggah Foto Kegiatan
          </Button>
        )}
      </div>

      {/* Filter and Search */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari caption foto atau nama kelompok..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 text-slate-900 text-sm py-5"
            />
          </div>
          <div>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none h-10 w-full sm:w-[160px] font-bold"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Belajar">Belajar</option>
              <option value="Ujian">Ujian</option>
              <option value="Lomba">Lomba</option>
              <option value="Wisuda">Wisuda</option>
              <option value="Kerja Bakti">Kerja Bakti</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredGallery.length > 0 ? (
          filteredGallery.map((item) => (
            <Card 
              key={item.id} 
              onClick={() => handleOpenDetail(item)}
              className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden cursor-pointer flex flex-col justify-between group"
            >
              <div className="h-44 overflow-hidden relative">
                <img 
                  src={item.url} 
                  alt={item.caption} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute top-3 left-3">
                  <Badge className="bg-slate-900/80 backdrop-blur text-white border border-slate-700 text-[9px] font-bold rounded-full">
                    {item.kategori}
                  </Badge>
                </div>
              </div>

              <div className="p-4 space-y-3 flex-grow flex flex-col justify-between">
                <p className="text-slate-800 text-xs font-bold leading-relaxed line-clamp-2 text-left">{item.caption}</p>
                
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-2.5">
                  <span className="truncate max-w-[130px]">{item.kelompok}</span>
                  <span className="flex items-center gap-1 shrink-0"><Calendar className="h-3 w-3" /> {item.tanggal}</span>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium">
            Tidak ada foto kegiatan ditemukan.
          </div>
        )}
      </div>

      {/* Image Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {activeItem && (
            <>
              <div className="h-56 bg-slate-950 flex items-center justify-center relative">
                <img src={activeItem.url} alt={activeItem.caption} className="h-full w-full object-cover" />
                <Badge className="absolute top-4 left-4 bg-emerald-600 text-white font-bold">{activeItem.kategori}</Badge>
              </div>

              <div className="p-6 space-y-4 flex-grow overflow-y-auto text-left">
                <div>
                  <h3 className="font-display text-base font-extrabold text-slate-900 leading-snug">{activeItem.caption}</h3>
                  <div className="flex gap-2 text-[10px] text-slate-400 font-bold mt-1 uppercase">
                    <span>{activeItem.kelompok}</span>
                    <span>•</span>
                    <span>{activeItem.tanggal}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-4">
                  {activeItem.tags.map((t, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[9px] font-bold rounded-full">
                      #{t}
                    </Badge>
                  ))}
                </div>

                {/* Comments */}
                <div className="space-y-3">
                  <h4 className="font-display text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Diskusi & Komentar ({activeItem.comments.length})</h4>
                  
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {activeItem.comments.map((c, i) => (
                      <div key={i} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <div className="flex justify-between font-bold text-slate-700 mb-0.5">
                          <span>{c.user}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{c.date}</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{c.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                    <Input
                      placeholder="Tulis tanggapan kegiatan di sini..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="rounded-xl border-slate-200 text-xs py-2 flex-grow"
                    />
                    <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold py-2 px-4 text-xs shrink-0">
                      Kirim
                    </Button>
                  </form>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-slate-900 flex items-center gap-1.5"><FolderHeart className="h-5.5 w-5.5 text-emerald-600" /> Unggah Dokumentasi Baru</DialogTitle>
            <DialogDescription>Tambahkan foto/video kegiatan TPQ binaan ke galeri pusat.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadPhoto} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Pilih Kelompok TPQ *</label>
              <select
                value={formKelompok}
                onChange={(e) => setFormKelompok(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
              >
                {kelompokList.map(k => (
                  <option key={k.id} value={k.namaKelompok}>{k.namaKelompok}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Kategori Kegiatan *</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
              >
                <option value="Belajar">Belajar Mengajar</option>
                <option value="Ujian">Ujian / Evaluasi</option>
                <option value="Lomba">Lomba / Festifal</option>
                <option value="Wisuda">Wisuda Kelulusan</option>
                <option value="Kerja Bakti">Kerja Bakti Bersama</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Pilih Berkas Foto Kegiatan *</label>
              <Input
                type="file"
                accept="image/*"
                required
                onChange={handleImageFileChange}
                className="rounded-xl border-slate-200 text-slate-900 text-sm cursor-pointer"
              />
              {formUrl && (
                <div className="mt-2 p-1.5 border border-slate-100 rounded-xl bg-slate-50 max-w-fit">
                  <span className="text-[9px] text-emerald-600 font-bold">Pratinjau gambar siap unggah</span>
                  <img src={formUrl} alt="Preview" className="h-20 w-32 object-cover rounded-lg mt-1 border border-slate-200" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Deskripsi / Keterangan Foto *</label>
              <textarea
                required
                placeholder="Tulis caption foto dokumentasi kegiatan..."
                value={formCaption}
                onChange={(e) => setFormCaption(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-2 text-sm focus:outline-none h-20"
              />
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold mt-4">
              Unggah Foto Galeri
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
