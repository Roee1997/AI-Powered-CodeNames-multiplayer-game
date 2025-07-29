using System.IO;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Swagger services (API documentation)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 🔹 Configure Kestrel to Listen on Both HTTP (5150) and HTTPS (5001)
//builder.WebHost.ConfigureKestrel(options =>
//{
//    options.ListenLocalhost(5150); // ✅ Add HTTP support

//    options.ListenLocalhost(5001, listenOptions =>
//    {
//        listenOptions.UseHttps(Path.Combine(
//            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
//            ".aspnet/https/aspnetcore.pfx"));
//    });
//});

// 🔹 Enable CORS (Allow Frontend to Access API)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();
app.UseCors("AllowAll");
// Configure the HTTP request pipeline (Swagger enabled only for Development).
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

}
app.UseCors("AllowAll"); // ✅ Apply CORS

app.UseAuthorization();

app.MapControllers();

app.Run();
